import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // O driver nativo do Argon2 nao pode ser empacotado pelo bundler do servidor.
  serverExternalPackages: ['@node-rs/argon2'],
}

export default nextConfig
