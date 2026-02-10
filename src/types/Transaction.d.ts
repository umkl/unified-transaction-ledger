type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
  date: Date;
  description: string;
  recipient: string;
  institutionId: string;
  institution?: Institution;
};
