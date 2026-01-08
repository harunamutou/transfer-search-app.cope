export async function onRequestPost({ request, env }) {
  const { line, station, distance } = await request.json();

  if (!line || !station || !distance) {
    return new Response(JSON.stringify({ error: "line, station, distance は必須" }), { status: 400 });
  }

  const exists = await env.DB.prepare(
    `SELECT id FROM stations WHERE station = ?`
  ).bind(station.trim()).first();

  if (exists) {
    return new Response(JSON.stringify({ added: false, station, line, distance }), { status: 200 });
  }

  await env.DB.prepare(
    `INSERT INTO stations (line, station, distance) VALUES (?, ?, ?)`
  ).bind(line.trim(), station.trim(), Number(distance)).run();

  return new Response(JSON.stringify({ added: true, station, line, distance }), { status: 200 });
}
