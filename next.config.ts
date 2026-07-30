import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // O driver nativo do Argon2 nao pode ser empacotado pelo bundler do servidor.
  serverExternalPackages: ['@node-rs/argon2'],
  // Imagem de produção sem o código-fonte nem as dependências de build.
  output: 'standalone',
}

export default nextConfig
