/** Postgres `time` comes back as "HH:MM:SS"; the API speaks "HH:MM". */
export const toHHMM = (value: string) => value.slice(0, 5);
