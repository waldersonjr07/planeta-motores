import Link from 'next/link'
import { LinkBotao } from '@/componentes/botao'
import { CabecalhoPagina, Cartao, Vazio } from '@/componentes/pagina'
import { Celula, Linha, Tabela } from '@/componentes/tabela'
import { listarClientes } from '@/modulos/clientes/consultas'
import { CampoBusca } from './busca'

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>
}) {
  const { busca } = await searchParams
  const lista = await listarClientes({ busca })

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        acoes={
          <LinkBotao href="/clientes/novo" variante="primario">
            Novo cliente
          </LinkBotao>
        }
      />

      <Cartao barra={<CampoBusca />}>
        {lista.length === 0 ? (
          <Vazio>
            {busca
              ? 'Nenhum cliente encontrado para essa busca.'
              : 'Nenhum cliente cadastrado ainda.'}
          </Vazio>
        ) : (
          <Tabela
            colunas={[
              { texto: 'Nome' },
              { texto: 'Telefone' },
              { texto: 'Cidade' },
              { texto: 'Equipamentos', numerica: true },
            ]}
          >
            {lista.map((cliente) => (
              <Linha key={cliente.id}>
                <Celula forte>
                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="text-acao hover:underline"
                  >
                    {cliente.nome}
                  </Link>
                </Celula>
                <Celula tom="suave">{cliente.telefone ?? '—'}</Celula>
                <Celula tom="suave">{cliente.cidade ?? '—'}</Celula>
                <Celula numerica>{cliente.quantidadeEquipamentos}</Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Cartao>
    </>
  )
}
