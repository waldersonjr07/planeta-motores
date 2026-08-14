/**
 * Nome do cookie de sessão, sozinho num arquivo só dele.
 *
 * O middleware roda no runtime Edge, onde não há `node:crypto` nem driver de
 * banco. Se ele importasse a constante de `guarda.ts`, arrastaria junto a
 * sessão, o Drizzle e o Postgres — código de servidor que não roda ali. Os
 * dois lados importam daqui e ninguém arrasta ninguém.
 */
export const COOKIE_SESSAO = 'pm_sessao'
