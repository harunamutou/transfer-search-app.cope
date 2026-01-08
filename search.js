export async function onRequestPost({ request, env }) {
  const { start, end, via = [] } = await request.json();
  const path = [start, ...via.filter(Boolean), end];

  let totalDistance = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const from = await env.DB.prepare(
      `SELECT distance FROM stations WHERE station = ?`
    ).bind(path[i].trim()).first();
    const to = await env.DB.prepare(
      `SELECT distance FROM stations WHERE station = ?`
    ).bind(path[i + 1].trim()).first();

    if (!from || !to) {
      return new Response(JSON.stringify({ error: `駅データ不足: ${path[i]} → ${path[i+1]}` }), { status: 400 });
    }

    totalDistance += Math.abs(to.distance - from.distance);
  }

  const fareRow = await env.DB.prepare(
    `SELECT fare FROM fares WHERE max >= ? ORDER BY max ASC LIMIT 1`
  ).bind(totalDistance).first();

  return new Response(JSON.stringify({
    path,
    distance: totalDistance,
    fare: fareRow ? fareRow.fare : null
  }), { headers: { "Content-Type": "application/json" }});
}
