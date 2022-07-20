import mockData from "../fixtures/mockData.json";

let sessionOutput;

mockData.forEach((data) => {
  // before each test, session details are retrieved and if session is active, group details are retrieved.
  beforeEach(() => {
    cy.request({
      method: "POST",
      url: Cypress.env("backend") + "getSessionData",
      body: JSON.stringify({
        sessionId: data.sessionId,
      }),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.sessionActive);

      sessionOutput = response.body.sessionActive;

      if (response.body.sessionActive) {
        cy.request({
          method: "POST",
          url: Cypress.env("backend") + "getGroupData",
          body: JSON.stringify({
            group: response.body.group,
          }),
          headers: {
            "content-type": "application/x-www-form-urlencoded",
          },
        }).then((response) => {
          expect(response.status).to.eq(200);
        });
      }
    });
  });

  /** The whole workflow runs for each session given in the fixture. */
  describe("Display screen", () => {
    console.log(data);
    // visited the URL with each session ID and asserts the displayed screen.
    it("visits each URL", () => {
      cy.visit(
        "https://staging-auth.avantifellows.org/?sessionId=" + data.sessionId
      );
      if (!sessionOutput) {
        cy.get('[data-cy="noClassMessage"]').should("be.visible");
      } else {
        cy.get('[data-cy="displayTitle"]').should("be.visible");
      }
    });

    it("allows user to enter", () => {
      if (sessionOutput) {
        cy.get('[data-cy="inputBox"]').type(data.userId);

        cy.request({
          method: "POST",
          url: Cypress.env("backend") + "checkForUser",
          body: JSON.stringify({
            userId: data.userId,
            collectionName: data.collectionName,
            columnName: data.columnName,
          }),
          headers: {
            "content-type": "application/x-www-form-urlencoded",
          },
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.true;
        });
        cy.get('[data-cy="submitButton"]').click();
      }
    });
  });
});
