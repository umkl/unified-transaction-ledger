import fs from "fs/promises";
import path from "path";
import { fileExists } from "./lib/file-exists";
import { getConfigPath } from "./lib/env";

export type BankBalance = {
    bankId: string;
    balance: number;
    currency: string;
};

export type BalanceSnapshot = {
    date: string;
    balances: BankBalance[];
    totalBalance: number;
};

const BALANCE_FILE_NAME = "balance-snapshots.json";

export const BALANCE_EXPORT_COLUMNS: { label: string; bankId: string }[] = [
    { label: "Trade Republic Cash", bankId: "TRADE_REPUBLIC_CASH" },
    { label: "Trade Republic Portfolio", bankId: "TRADE_REPUBLIC_PORTFOLIO" },
    { label: "Flatex Cash", bankId: "FLATEX_CASH" },
    { label: "Flatex Portfolio", bankId: "FLATEX_PORTFOLIO" },
    { label: "Raiffeisen Cash", bankId: "RAIFFEISEN_CASH" },
    { label: "Revolut Cash", bankId: "REVOLUT_CASH" },
    { label: "N26 Cash", bankId: "N26_CASH" },
];

export function getBalanceFilePath() {
    const configDir = path.dirname(getConfigPath());
    return path.join(configDir, BALANCE_FILE_NAME);
}

export function toDateKey(date: Date = new Date()) {
    return date.toISOString().split("T")[0];
}

export function computeTotalBalance(balances: BankBalance[]) {
    return balances.reduce((sum, balance) => sum + balance.balance, 0);
}

export function formatDateForExport(dateKey: string) {
    const [year, month, day] = dateKey.split("-");
    if (!year || !month || !day) return dateKey;
    return `${day}-${month}-${year.slice(-2)}`;
}

export class BalanceSnapshots {
    private snapshots: BalanceSnapshot[] = [];

    private constructor(snapshots: BalanceSnapshot[]) {
        this.snapshots = snapshots;
    }

    public static async create(): Promise<BalanceSnapshots> {
        const filePath = getBalanceFilePath();
        const exists = await fileExists(filePath);
        if (!exists) return new BalanceSnapshots([]);

        const raw = await fs.readFile(filePath, { encoding: "utf-8" });
        let parsed: BalanceSnapshot[] = [];
        try {
            parsed = JSON.parse(raw) as BalanceSnapshot[];
        } catch {
            parsed = [];
        }

        return new BalanceSnapshots(parsed ?? []);
    }

    public getSnapshots() {
        return [...this.snapshots];
    }

    public upsertSnapshot(snapshot: BalanceSnapshot) {
        const index = this.snapshots.findIndex(
            (entry) => entry.date === snapshot.date,
        );
        if (index >= 0) {
            this.snapshots[index] = snapshot;
            return;
        }
        this.snapshots.push(snapshot);
    }

    public async persist(): Promise<void> {
        const filePath = getBalanceFilePath();
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        const ordered = [...this.snapshots].sort((a, b) =>
            a.date.localeCompare(b.date),
        );
        const serialized = JSON.stringify(ordered, null, 2);
        await fs.writeFile(filePath, serialized, "utf-8");
    }

    public async writeToJsonFile(): Promise<void> {
        await this.persist();
    }
}
