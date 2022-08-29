import { a } from '@monorepo/package-a';
import { anotherA } from '@monorepo/package-a/non-index';
import { oneMoreA } from '@monorepo/package-a/src/one-more';

console.log(a);
console.log(anotherA);
console.log(oneMoreA);

export const b = 'b';
