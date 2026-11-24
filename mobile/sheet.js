// Checklist sheet of groups (optionally with the media types), shared by the group random pick and the wheel.
const $ = id => document.getElementById(id)

function make(tag, props = {}, kids = []) {
  const e = Object.assign(document.createElement(tag), props)
  e.append(...kids)
  return e
}
const option = (label, checked) => {
  const input = make('input', { type: 'checkbox', checked })
  return [make('label', { className: 'opt' }, [input, label]), input]
}

// Resolves with { groups, types, action } when an action button is pressed with a valid choice, null when cancelled.
// actions: [{ id, label, primary? }], types: also ask for Bilder/Videos (both preselected), groups: names to choose from.
export function chooseGroups({ title, groups, types = false, actions }) {
  return new Promise(resolve => {
    const dlg = $('sheet')
    let result = null
    const cancel = make('button', { type: 'button', className: 'btn', textContent: 'Abbrechen', onclick: () => dlg.close() })
    const acts = make('div', { className: 'acts' }, [cancel])
    const kids = [make('h2', { id: 'sheet-title', textContent: title })]
    if (!groups.length) kids.push(make('p', { className: 'mut', textContent: 'Keine Gruppen vorhanden.' }))
    else {
      const boxes = groups.map(g => option(g, false))
      kids.push(make('fieldset', {}, [make('legend', { textContent: 'Gruppen' }), make('div', { className: 'glist' }, boxes.map(b => b[0]))]))
      const kinds = [['image', 'Bilder'], ['video', 'Videos']].map(([k, label]) => [k, ...option(label, true)])
      if (types) kids.push(make('fieldset', {}, [make('legend', { textContent: 'Medientyp' }), make('div', { className: 'types' }, kinds.map(k => k[1]))]))
      const hint = make('p', { className: 'err', role: 'alert', hidden: true, textContent: `Bitte mindestens eine Gruppe${types ? ' und einen Typ' : ''} wählen.` })
      kids.push(hint)
      for (const a of actions) {
        acts.append(make('button', { type: 'button', className: 'btn' + (a.primary ? ' pri' : ''), textContent: a.label, onclick: () => {
          const chosen = groups.filter((_, i) => boxes[i][1].checked)
          const kindsOn = types ? kinds.filter(k => k[2].checked).map(k => k[0]) : []
          hint.hidden = chosen.length > 0 && (!types || kindsOn.length > 0)
          if (hint.hidden) { result = { groups: chosen, types: kindsOn, action: a.id }; dlg.close() }
        } }))
      }
    }
    kids.push(acts)
    dlg.replaceChildren(...kids)
    dlg.onclose = () => resolve(result)
    dlg.onclick = e => { // a tap on the backdrop: the click target is the dialog itself, so check the point against its box
      const r = dlg.getBoundingClientRect()
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close()
    }
    dlg.showModal()
  })
}
