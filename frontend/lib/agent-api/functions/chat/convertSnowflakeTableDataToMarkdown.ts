/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Converts Snowflake JSON results into a Markdown table.
 * @param {object} responseJson - The Snowflake SQL ExecutionResponse.
 * @returns {string} A Markdown string representing the data.
 */
export function convertSnowflakeTableDataToMarkdown(tableData: any): string {
    // Extract column names
    const columns = tableData.resultSetMetaData.rowType.map((colDef: any) => colDef.name);

    // Prepare table header in Markdown
    // e.g. | COL1 | COL2 | ... |
    let markdown = `| ${columns.join(' | ')} |\n`;

    // Prepare the header separator row in Markdown
    // e.g. | --- | --- | ... |
    markdown += `| ${columns.map(() => '---').join(' | ')} |\n`;

    // Build table rows
    // tableData.data is an array of arrays, e.g. [ [val1, val2], [val3, val4], ... ]
    tableData.data.forEach((row: any) => {
        const rowValues = row.map((val: any) => (val == null ? '' : val));
        markdown += `| ${rowValues.join(' | ')} |\n`;
    });

    return markdown;
}