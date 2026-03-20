import fs from "fs/promises";
import path from "path";
import {
    BalanceSnapshots,
    BALANCE_EXPORT_COLUMNS,
    formatDateForExport,
} from "./Balance";
import { log } from "./utils";

const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const normalized = String(value);
    if (/[,"\n\r]/.test(normalized)) {
        return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
};

export default async function balanceExportAction() {
    const snapshots = await BalanceSnapshots.create();
    const entries = snapshots
        .getSnapshots()
        .sort((a, b) => a.date.localeCompare(b.date));

    if (entries.length === 0) {
        log("No balance snapshots found. Run `utl balance` first.");
        return;
    }

    const header = [
        "date",
        ...BALANCE_EXPORT_COLUMNS.map((col) => col.label),
    ];

    const lines = [header.join(",")];
    for (const snapshot of entries) {
        const balanceMap = new Map(
            snapshot.balances.map((balance) => [
                balance.bankId,
                balance.balance,
            ]),
        );
        const row = [
            formatDateForExport(snapshot.date),
            ...BALANCE_EXPORT_COLUMNS.map((col) =>
                escapeCSV(balanceMap.get(col.bankId) ?? ""),
            ),
        ];
        lines.push(row.join(","));
    }

    const csvWithBOM = "\ufeff" + lines.join("\n");
    const outputPath = path.join(process.cwd(), "balances.csv");
    await fs.writeFile(outputPath, csvWithBOM, "utf-8");
    log(`Balances written to ${outputPath}`);
}
