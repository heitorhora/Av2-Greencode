import bcrypt from "bcryptjs";
import { Papel } from "@prisma/client";
import { UsuarioRepository as Repo } from "../repositories/UsuarioRepository";
import { AppError } from "../lib/erros";
import { prisma } from "../lib/prisma";
import { auditar } from "../lib/auditoria";
import { exigirUmaLinha } from "../lib/versao";
import { CUSTO_HASH } from "./AuthService";

function validarSenha(senha: string) {
  if (senha.length < 8 || !/\d/.test(senha) || !/[A-Za-z]/.test(senha)) {
    throw AppError.invalido("Senha deve ter ao menos 8 caracteres, com letras e numeros.");
  }
}

export interface EdicaoAdmin { versao: number; nome?: string; email?: string | null; papel?: Papel; ativo?: boolean; senha?: string }
export interface EdicaoPerfil { versao: number; nome?: string; email?: string | null; senhaAtual?: string; novaSenha?: string }

export const UsuarioService = {
  listar: () => Repo.listar(),

  async buscar(id: string) {
    const u = await Repo.selecionar(id);
    if (!u) throw AppError.naoEncontrado("Usuario");
    return u;
  },

  async criar(atorId: string, d: { username: string; nome: string; email?: string | null; senha: string; papel: Papel }) {
    validarSenha(d.senha);
    return prisma.$transaction(async (tx) => {
      const u = await Repo.criar(
        { username: d.username.trim().toLowerCase(), nome: d.nome.trim(), email: d.email || null, papel: d.papel, hashSenha: await bcrypt.hash(d.senha, CUSTO_HASH) },
        tx
      );
      await auditar(tx, atorId, "CRIAR", "Usuario", u.id, { username: u.username, papel: u.papel });
      return u;
    });
  },

  /** Administrador edita qualquer campo, inclusive papel, ativo e reset de senha. */
  async editar(atorId: string, id: string, d: EdicaoAdmin) {
    if (d.senha !== undefined) validarSenha(d.senha);
    return prisma.$transaction(
      async (tx) => {
        const alvo = await Repo.porId(id, tx);
        if (!alvo) throw AppError.naoEncontrado("Usuario");

        const deixaDeSerAdminAtivo = alvo.papel === "ADMINISTRADOR" && alvo.ativo &&
          ((d.papel !== undefined && d.papel !== "ADMINISTRADOR") || d.ativo === false);
        if (deixaDeSerAdminAtivo && (await Repo.contarAdminsAtivos(tx)) <= 1) {
          throw AppError.conflito("Nao e possivel remover o ultimo administrador ativo do sistema.");
        }

        const data: Record<string, unknown> = {};
        if (d.nome !== undefined) data.nome = d.nome.trim();
        if (d.email !== undefined) data.email = d.email || null;
        if (d.papel !== undefined) data.papel = d.papel;
        if (d.ativo !== undefined) data.ativo = d.ativo;
        if (d.senha !== undefined) data.hashSenha = await bcrypt.hash(d.senha, CUSTO_HASH);

        exigirUmaLinha(await Repo.atualizarComVersao(id, d.versao, data, tx), "Usuario");
        await auditar(tx, atorId, "EDITAR", "Usuario", id, { campos: Object.keys(data).map((k) => (k === "hashSenha" ? "senha" : k)) });
        return (await Repo.selecionar(id, tx))!;
      },
      { isolationLevel: "Serializable" } // dois admins se rebaixando ao mesmo tempo nao deixam o sistema sem admin
    );
  },

  /** Qualquer usuario edita o proprio perfil; trocar senha exige a senha atual. */
  async editarPerfil(id: string, d: EdicaoPerfil) {
    return prisma.$transaction(async (tx) => {
      const eu = await Repo.porId(id, tx);
      if (!eu) throw AppError.naoEncontrado("Usuario");
      const data: Record<string, unknown> = {};
      if (d.nome !== undefined) data.nome = d.nome.trim();
      if (d.email !== undefined) data.email = d.email || null;
      if (d.novaSenha !== undefined) {
        if (!d.senhaAtual || !(await bcrypt.compare(d.senhaAtual, eu.hashSenha))) throw AppError.invalido("Senha atual incorreta.");
        validarSenha(d.novaSenha);
        data.hashSenha = await bcrypt.hash(d.novaSenha, CUSTO_HASH);
      }
      exigirUmaLinha(await Repo.atualizarComVersao(id, d.versao, data, tx), "Usuario");
      await auditar(tx, id, "EDITAR_PERFIL", "Usuario", id, { campos: Object.keys(data).map((k) => (k === "hashSenha" ? "senha" : k)) });
      return (await Repo.selecionar(id, tx))!;
    });
  },
};
