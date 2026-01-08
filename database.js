// Cloudflare D1 用のDBアクセス共通関数
export async function queryD1(sql, params = []) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  const databaseId = process.env.CF_DATABASE_ID; // D1のUUID
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ sql, params }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.errors?.[0]?.message || "D1 query failed");
    }

    return data.result || [];
  } catch (err) {
    console.error("D1 Query Error:", err.message);
    throw err;
  }
}
