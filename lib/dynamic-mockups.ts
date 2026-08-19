const DYNAMIC_MOCKUPS_API_KEY = process.env.DYNAMIC_MOCKUPS_API_KEY!
const API_BASE = 'https://app.dynamicmockups.com/api/v1'

export async function generateMockup(
  templateId: string,
  smartObjectUuid: string,
  labelUrl: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/renders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': DYNAMIC_MOCKUPS_API_KEY,
    },
    body: JSON.stringify({
      mockup_uuid: templateId,
      smart_objects: [
        {
          uuid: smartObjectUuid,
          asset: { url: labelUrl },
        },
      ],
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Dynamic Mockups API error: ${error}`)
  }

  const { data } = await res.json()
  return data.export_path as string
}
