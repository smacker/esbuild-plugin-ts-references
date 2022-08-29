(() => {
  // test/monorepo/package-a/src/index.ts
  var a = "a";

  // test/monorepo/package-a/src/non-index.ts
  var anotherA = "b";

  // test/monorepo/package-a/src/one-more.ts
  var oneMoreA = "c";

  // test/monorepo/package-b/src/index.ts
  console.log(a);
  console.log(anotherA);
  console.log(oneMoreA);
  var b = "b";
})();
