import Image from 'next/image'

/**
 * O emblema da oficina. O recorte circular descarta os cantos do arquivo, que
 * é quadrado com o campo marinho embutido — assim a marca assenta em qualquer
 * fundo sem virar um quadrado colado na tela.
 *
 * Passa pelo otimizador do Next porque o original tem 1024×1024: servi-lo
 * inteiro para desenhar 38 px no menu, em toda página, é desperdício.
 *
 * `alt` vazio de propósito: onde o emblema aparece, o nome da empresa está
 * escrito ao lado — repetir só faria o leitor de tela dizer duas vezes.
 */
export function Emblema({ tamanho = 40 }: { tamanho?: number }) {
  return (
    <Image
      src="/logo-planeta-motores.jpeg"
      alt=""
      width={tamanho}
      height={tamanho}
      // O emblema é o maior elemento pintado na primeira tela, no menu e na
      // entrada. Sem `priority` ele entra na fila e atrasa a primeira pintura.
      priority
      className="shrink-0 rounded-full"
    />
  )
}
