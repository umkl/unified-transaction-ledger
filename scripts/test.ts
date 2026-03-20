import { Brokerize, BrokerizeConfig } from "@brokerize/client";

const brokerize = new Brokerize({
    clientId: "mTM483GWUccIppe5",
    basePath: "https://app.brokerize.com/",
} satisfies BrokerizeConfig);

brokerize.createGuestUser().then((accounts) => {
    console.log(accounts);
});

// brokerize.createAuth()
