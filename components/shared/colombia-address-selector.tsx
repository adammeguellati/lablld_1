'use client'

import { COLOMBIA_DEPARTMENTS, DEPARTMENT_NAMES } from '@/lib/colombia-locations'

interface Props {
  province: string
  city: string
  onProvinceChange: (v: string) => void
  onCityChange: (v: string) => void
  className?: string
}

export function ColombiaAddressSelector({ province, city, onProvinceChange, onCityChange, className = '' }: Props) {
  const ic = `w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors bg-white ${className}`
  const cities = province ? (COLOMBIA_DEPARTMENTS[province] ?? []) : []

  function handleDepartmentChange(val: string) {
    onProvinceChange(val)
    onCityChange('')
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Departamento *</label>
        <select value={province} onChange={(e) => handleDepartmentChange(e.target.value)} className={ic}>
          <option value="">Seleccionar...</option>
          {DEPARTMENT_NAMES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Ciudad *</label>
        <select value={city} onChange={(e) => onCityChange(e.target.value)} className={ic} disabled={!province}>
          <option value="">{province ? 'Seleccionar...' : 'Elige depto. primero'}</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
