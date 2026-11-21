---
name: iswc-a11y
description: Reglas de DOM y accesibilidad de los custom elements del kit: atributos en el constructor, el guard de define, los auditadores textuales y la migracion a render(). Usar al tocar componentes que definen roles, aria o atributos.
---

## El atributo NO se escribe en el constructor

Un custom element creado por SCRIPT (`document.createElement('iswc-x')`) **no puede traer atributos cuando su
constructor termina**: Blink los descarta y lanza un `NotSupportedError` sin capturar
(`Failed to execute 'createElement' on 'Document': The result must not have attributes`).
El parser si pone los atributos DESPUES del constructor, por eso con `innerHTML` no se nota... y el atributo
se **pierde en silencio**.

Regla: el atributo se escribe en `onConnected()` / `connectedCallback()` (o en el metodo donde el nodo entra
en el DOM). Si el elemento se crea por script, ahi es donde se aplica.

Trampa asociada: un componente que en su constructor busca dentro un custom element hijo (por ejemplo el
input nativo de un `<iswc-input>`) y le lee propiedades **falla**: todavia no esta pintado. Se rompio de
verdad en `iswc-mention` (2 pageerrors y el elemento en estado `failed`). Se arregla moviendolo a
`connectedCallback` (con una microtarea si hace falta).

## El guard de define (por que un stub bloquearia el componente real)

El kit define con `customElements.get(tag) || customElements.define(tag, ctor)`. Consecuencia: si algo define
el tag ANTES (un placeholder), **la clase real nunca se registra**. Un stub no es gratis: habria que cambiar
el helper para permitir el reemplazo del prototipo.

## Los auditadores son TEXTUALES

Los dos guardianes de la auditoria de componentes no ejecutan el codigo: leen el texto. Por eso se
desincronizan cuando cambia una base:

- `scripts/sondas/components.ts` -> `BASE_MOLDE` (las bases que ya aportan `attributeChangedCallback`).
- `tests/.audit/motor/validators/runtime.ts` -> el regex `extendsBase`.

Cuando se extrae una base nueva (por ejemplo `IswcFormChrome`), hay que **anadirla a las dos listas** o el
gate dara falsos errores. Y el detector de observados usa `[:=]\s*\[`: una declaracion con anotacion
(`const OBSERVED: string[] = [...]`) **no la ve**, lo que produce el error simetrico `callback-sin-observed`.

## Los dos errores y su verdad

- `observed-sin-callback`: el componente declara `observedAttributes` y no tiene `attributeChangedCallback`.
  Si el atributo debe reaccionar en caliente: callback propio con `super.attributeChangedCallback(...)`
  (que sincroniza los `@prop` con los atributos) + el guard del molde (`!this.mounted || oldVal === newVal`).
  Si el atributo solo se lee en el primer render: **no debe observarse** (se quita de `observedAttributes`).
- `callback-sin-observed`: hay callback y la lista de observados no se ve (casi siempre la anotacion).

El comportamiento en caliente puede estar bien y el auditor aun asi marcarlo: antes de tocar codigo, mira si
el defecto es de la lista de bases o del detector.

## La migracion a render()

Cuando un componente pasa a pintarse con `render()`, se migran de golpe: el markup, el `observedAttributes`
y el `attributeChangedCallback`. Revisa los tres a la vez, o el guardian se queja.

## Reglas de accesibilidad que el kit sostiene

- El rol va en el HOST cuando el arbol se aplana (el listbox tiene las opciones como hijos directos).
- Los `aria-*` que dependen del estado (aria-expanded, aria-checked, aria-valuetext) se actualizan en el
  metodo que cambia ese estado, no en el constructor.
- `exportparts`/`part` se escriben al conectar.
- Contraste: el dialog sin tema estaba en 3,33:1 y con tema en 21,00:1 (medido en Edge real).
