const BASE = 'https://api.sudomock.com/api/v1'

export async function generateMockup(
  mockupUuid: string,
  smartObjectUuid: string,
  labelUrl: string,
  soWidth?: number | null,
  soHeight?: number | null,
): Promise<string> {
  const asset: Record<string, unknown> = { url: labelUrl, fit: 'fill' }
  if (soWidth && soHeight) asset.size = { width: soWidth, height: soHeight }

  const res = await fetch(`${BASE}/renders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.SUDOMOCK_API_KEY!,
    },
    body: JSON.stringify({
      mockup_uuid: mockupUuid,
      smart_objects: [{ uuid: smartObjectUuid, asset }],
      export_options: { image_format: 'webp', image_size: 2048, quality: 95 },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SudoMock ${res.status}: ${text}`)
  }

  const json = await res.json()
  const url = json.url ?? json.data?.url ?? json.data?.print_files?.[0]?.export_path ?? json.renders?.[0]?.url
  if (!url) throw new Error('SudoMock no devolvió URL de imagen')
  return url as string
}
