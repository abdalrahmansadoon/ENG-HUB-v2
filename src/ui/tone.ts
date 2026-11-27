/** لون ثابت للمادة حسب ترتيبها (1 إلى 7)، و0 للعام. */
export const toneOf = (order: number | undefined) => (order === undefined ? 0 : ((Math.max(1, Math.round(order)) - 1) % 7) + 1);

/** لون ثابت للعضو حسب معرّفه. */
export const memberTone = (id: string) => ([...id].reduce((n, c) => n + c.charCodeAt(0), 0) % 7) + 1;
