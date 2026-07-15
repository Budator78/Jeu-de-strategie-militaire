import { OfficerPortrait } from './icons'
import './hud.css'

/** Top-right diamond-framed commander portrait (original art). */
export function PortraitBadge() {
  return (
    <div className="portrait-badge" title="Commandant">
      <div className="portrait-inner">
        <OfficerPortrait />
      </div>
    </div>
  )
}
