describe("Get test data", () => {
  it("test data", () => {
    cy.readFile("./cypress/e2e/E2E Fixtures.csv").then((file) => {
      const headers = file.slice(0, file.indexOf("\n")).split(",");
      const rows = file.slice(file.indexOf("\n") + 1).split("\n");
      const data = rows.map(function (row) {
        const values = row.split(",");
        const el = headers.reduce(function (object, header, index) {
          object[header] = values[index];
          return object;
        }, {});
        return el;
      });
      cy.writeFile("./cypress/fixtures/mockData.json", data);
    });
  });
});
