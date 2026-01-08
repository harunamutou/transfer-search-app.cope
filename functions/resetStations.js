export async function onRequestPost({ env }) {
  await env.DB.prepare(`DELETE FROM stations`).run();
  return new Response(JSON.stringify({ message: "駅データを完全リセットしました" }), { status: 200 });
}
