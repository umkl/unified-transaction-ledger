"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@brokerize/client");
const brokerize = new client_1.Brokerize({
    clientId: "mTM483GWUccIppe5",
    basePath: "https://app.brokerize.com/",
});
brokerize.createGuestUser().then((accounts) => {
    console.log(accounts);
});
// brokerize.createAuth()
//# sourceMappingURL=test.js.map