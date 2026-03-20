import { Brokerize, BrokerizeConfig } from "@brokerize/client";

async function someBrokerizeActions() {
    const clientId = process.env.BROKERIZE_CLIENT_ID;
    if (!clientId) {
        throw new Error(
            "Missing BROKERIZE_CLIENT_ID. Set env var to your Brokerize clientId.",
        );
    }

    const brokerizeConfig: BrokerizeConfig = {
        clientId,
        /* provide implementations of fetch, AbortController and WebSocket that will
       be used for interacting with the API. If you leave out those dependencies, they will default to globally available
       implementations, which should usually work in browsers and newer Node.JS environments, but may fail in other JS environments
       that do not provide them (e.g. runtimes in mobile apps). */
        fetch: ((url, init) => {
            return fetch(url, init);
        }) as any,
        createAbortController: () => new AbortController(),
        createWebSocket: (url, protocol) => new WebSocket(url, protocol),
        // basePath: 'https://api-preview.brokerize.com', // this is the default value
        // basePathCryptoService: 'https://crypto-service-api.com' // the optional external crypto service
    };
    const brokerize = new Brokerize(brokerizeConfig);

    /* create a guest user. the result contains the user's tokens and be stored, e.g. in a cookie or session storage */
    const guestUserAuthContextConfiguration = await brokerize.createGuestUser();

    const tokenRefreshCallback = (updatedAuthCtx) => {
        /* this callback gets called when the token set gets updated and allows you to store it */
    };

    /* with the guest user's token, create an authorized context.*/
    const ctx = brokerize.createAuthorizedContext(
        guestUserAuthContextConfiguration,
        tokenRefreshCallback,
    );

    /* do some API calls */
    console.log("BROKERS", await ctx.getBrokers());
    console.log("EXCHANGES", await ctx.getExchanges());
    const { id } = await ctx.createDemoAccount();
    const demoAccounts = await ctx.getDemoAccounts();
    const demoAccount = demoAccounts.accounts.find((x) => x.accountId == id);

    const session = await ctx.addSession({
        brokerName: "DEMO",
        env: "test",
        password: "42",
        username: demoAccount!.accountName,
    });

    /* subscribe to some non-existent decoupled operation */
    const client = ctx.createWebSocketClient();
    const s = client.subscribeDecoupledOperation(
        {
            decoupledOperationId: "X",
            sessionId: "XXXX",
        },
        (err, data) => {
            console.log("SUBSCR");
        },
    );
    s.unsubscribe();
    console.log("SESSION", session);
}
someBrokerizeActions().then(console.log, console.error);
