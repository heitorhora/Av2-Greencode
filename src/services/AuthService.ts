import bcrypt from "bcryptjs";
import { UsuarioRepository } from "../repositories/UsuarioRepository";
import { AppError } from "../lib/erros";
import { prisma } from "../lib/prisma";
import { auditar } from "../lib/auditoria";

export const CUSTO_HASH = 10;
// hash descartavel: login com usuario inexistente gasta o mesmo tempo (evita enumerar usernames)
const HASH_FALSO = bcrypt.hashSync("nao-existe", CUSTO_HASH);

export const AuthService = {
  async login(username: string, senha: string) {
    const u = await UsuarioRepository.porUsername(username);
    const ok = await bcrypt.compare(senha, u?.hashSenha ?? HASH_FALSO);
    if (!u || !ok || !u.ativo) throw new AppError(401, ["Usuario ou senha invalidos."]);
    await auditar(prisma, u.id, "LOGIN", "Usuario", u.id);
    return { id: u.id, username: u.username, nome: u.nome, papel: u.papel };
  },
};
