export function generateCSV(transactions: any[]) {
    const header = "Fecha,Descripción,Monto,Moneda,Tipo,Frecuencia,Categoría\n";
    const rows = transactions.map(t => {
        return `${new Date(t.date).toLocaleDateString()},${t.description},${t.amount},${t.currency},${t.type},${t.frequency},${t.category || ''}`;
    }).join("\n");
    return header + rows;
}

export function filterTransactionsByRange(transactions: any[], range: 'week' | 'month' | 'custom', start?: Date, end?: Date) {
    const now = new Date();
    if (range === 'week') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return transactions.filter(t => new Date(t.date) >= lastWeek);
    }
    if (range === 'month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return transactions.filter(t => new Date(t.date) >= lastMonth);
    }
    if (range === 'custom' && start && end) {
        return transactions.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });
    }
    return transactions;
}
