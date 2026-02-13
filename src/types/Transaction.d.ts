type Transaction = {
    id: string;
    amount: number;
    type: string;
    date: Date;
    description: string;
    recipient: string;
    institutionId: string;
    institution?: Institution;
};
