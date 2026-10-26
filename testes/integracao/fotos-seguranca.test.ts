import { randomUUID } from 'node:crypto'
import { beforeEach, expect, test } from 'vitest'
import { salvarFoto } from '../../src/modulos/os/fotos'
import { limparBanco } from '../ajuda/banco'
import { cenarioOs } from '../ajuda/os'

beforeEach(limparBanco)

test('recusa salvarFoto quando osId tem formato inválido ou tentativa de path traversal', async () => {
  const arquivoFalso = new File([Buffer.from([0xff, 0xd8, 0xff, 0x00])], 'teste.jpg', {
    type: 'image/jpeg',
  })

  const resultadoTraversal = await salvarFoto('../../etc', arquivoFalso, 'chegada')
  expect(resultadoTraversal.ok).toBe(false)
  if (!resultadoTraversal.ok) {
    expect(resultadoTraversal.erro).toContain('inválido')
  }

  const resultadoInvalido = await salvarFoto('nao-e-uuid', arquivoFalso, 'chegada')
  expect(resultadoInvalido.ok).toBe(false)
  if (!resultadoInvalido.ok) {
    expect(resultadoInvalido.erro).toContain('inválido')
  }
})

test('recusa salvarFoto se a OS não existir no banco de dados', async () => {
  const osIdInexistente = randomUUID()
  const arquivoValido = new File([Buffer.from([0xff, 0xd8, 0xff, 0xe0])], 'teste.jpg', {
    type: 'image/jpeg',
  })

  const resultado = await salvarFoto(osIdInexistente, arquivoValido, 'chegada')
  expect(resultado.ok).toBe(false)
  if (!resultado.ok) {
    expect(resultado.erro).toContain('não encontrada')
  }
})

test('recusa arquivo com magic bytes forjados ou corrompidos', async () => {
  const { osId } = await cenarioOs()
  // Arquivo de texto disfarçado com MIME type image/jpeg
  const arquivoMalicioso = new File([Buffer.from('<?php echo "hack"; ?>')], 'shell.php.jpg', {
    type: 'image/jpeg',
  })

  const resultado = await salvarFoto(osId, arquivoMalicioso, 'chegada')
  expect(resultado.ok).toBe(false)
  if (!resultado.ok) {
    expect(resultado.erro).toContain('Formato não aceito ou arquivo corrompido')
  }
})

test('aceita e salva foto com magic bytes JPEG válidos', async () => {
  const { osId } = await cenarioOs()
  const jpegValido = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
  const arquivo = new File([jpegValido], 'motor.jpg', { type: 'image/jpeg' })

  const resultado = await salvarFoto(osId, arquivo, 'chegada', 'Foto do motor')
  expect(resultado.ok).toBe(true)
  if (resultado.ok) {
    expect(resultado.dados.id).toBeDefined()
  }
})
