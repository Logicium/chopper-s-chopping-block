/**
 * The public route table, with each page's SEO record.
 *
 * This is the only list of public routes. The router spreads it; the
 * prerender (scripts/prerender.ts) walks it to write one HTML file per page,
 * the sitemap, robots.txt and llms.txt; the runtime applies the same records on
 * navigation. Admin routes live in the router and are never indexed. Every
 * field reads the reactive site config when it is called, so a provisioned
 * build and a hydrated page both describe the owner's shop. No browser
 * dependency here: the prerender imports this under Node.
 */
import type { RouteRecordRaw } from 'vue-router'
import { absUrl, esc, serviceNode, type SiteConfig } from '@apotome/archetype-shared/seo/index'
import * as b from '@apotome/archetype-shared/seo/bodies'
import { nameListNode } from '@apotome/archetype-shared/seo/nodes'
import { siteConfig as c, type ServiceCategory, type ProjectEntry } from './config/site.config'

const town = () => c.contact.address.split(',')[1]?.trim() ?? ''
const place = () => (town() ? `${c.brand} in ${town()}` : c.brand)

function servicesBody(list: ServiceCategory[], intro?: string, title?: string): string {
  const cats = list.filter((cat) => cat.items?.length)
  if (!cats.length) return ''
  return `<section>${b.h(2, title)}${b.p(intro)}${cats
    .map(
      (cat) =>
        `<section>${b.h(3, cat.name)}${b.p(cat.description)}<ul>${cat.items
          .map((it) => `<li><strong>${esc(it.name)}</strong>${it.description ? `, ${esc(it.description)}` : ''}${it.price ? ` (${esc(it.price)})` : ''}</li>`)
          .join('')}</ul></section>`,
    )
    .join('')}</section>`
}

function capabilitiesBody(title?: string): string {
  const items = c.capabilities.items.filter((it) => it.label)
  if (!items.length) return ''
  return `<section>${b.h(2, title)}${b.p(c.capabilities.intro)}<dl>${items
    .map((it) => `<dt>${esc(it.label)}</dt><dd>${esc(it.value)}${it.detail ? `. ${esc(it.detail)}` : ''}</dd>`)
    .join('')}</dl></section>`
}

function projectsBody(list: ProjectEntry[], intro?: string): string {
  const items = list.filter((p) => p.title)
  if (!items.length) return ''
  return `<section>${b.p(intro)}${items
    .map((p) => `<article>${b.h(3, p.title)}${b.p(p.category)}${b.p(p.blurb)}${b.ul(p.meta ?? [])}</article>`)
    .join('')}</section>`
}

function dispatchBody(): string {
  const d = c.dispatch
  return `<section>${b.h(2, c.sections.dispatch.label)}${d.phone ? `<p>${esc(c.sections.dispatch.label)}: <a href="tel:${esc(d.phone.replace(/[^\d+]/g, ''))}">${esc(d.phone)}</a></p>` : ''}${
    d.emergency && (d.emergencyPhone || d.phone) ? `<p>${esc(c.sections.dispatch.emergencyLabel)}: ${esc(d.emergencyPhone || d.phone)}</p>` : ''
  }${b.p(d.serviceArea ? `Service area: ${d.serviceArea}` : undefined)}</section>`
}

/** One Service node per item the shop lists, with its price when it states one. */
function serviceNodes(site: SiteConfig, path: string): object[] {
  const items = c.services.categories.flatMap((cat) => cat.items.filter((it) => it.name).map((it) => ({ cat, it })))
  return items.map(({ cat, it }, i) => {
    const price = b.priceNumber(it.price)
    const node = serviceNode(site, {
      name: it.name,
      description: it.description,
      type: cat.name,
      offers: price !== undefined ? { price } : it.price ? { description: it.price } : undefined,
    }) as Record<string, unknown>
    // several services share one page: give each its own @id
    node['@id'] = `${absUrl(site, path)}#service-${i + 1}`
    return node
  })
}

export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('./views/HomeView.vue'),
    meta: {
      seo: {
        description: () => b.compose([c.blurb, c.dispatch.serviceArea ? `Serving ${c.dispatch.serviceArea}` : undefined, c.tagline]),
        body: () =>
          b.main(
            b.hero(c.sections.hero.title || c.brand, c.tagline, c.blurb),
            dispatchBody(),
            servicesBody(c.services.categories, c.services.intro, c.sections.services.title),
            capabilitiesBody(c.sections.capabilities.title),
            b.story(c.story, c.sections.story.eyebrow),
            b.hours(c.hours, c.sections.hours.title, c.sections.hours.note),
            b.testimonials(c.testimonials, c.sections.reviews.title),
            b.contact(c.contact, c.sections.contact.title),
          ),
      },
    },
  },
  {
    path: '/services',
    name: 'services',
    component: () => import('./views/ServicesView.vue'),
    meta: {
      seo: {
        title: () => c.sections.servicesPage.title,
        description: () => {
          const cats = b.listOf(c.services.categories.map((cat) => cat.name.toLowerCase()))
          return b.compose([`Services and rates at ${place()}${cats ? `: ${cats}` : ''}`, c.sections.servicesPage.subtitle])
        },
        schema: ({ site, path }) => serviceNodes(site, path),
        body: () =>
          b.main(
            b.hero(c.sections.servicesPage.title, c.sections.servicesPage.eyebrow, c.sections.servicesPage.subtitle),
            dispatchBody(),
            servicesBody(c.services.categories, c.services.intro),
            capabilitiesBody(c.sections.servicesPage.capabilitiesTitle),
          ),
      },
    },
  },
  {
    path: '/projects',
    name: 'projects',
    component: () => import('./views/ProjectsView.vue'),
    meta: {
      seo: {
        title: () => c.sections.projectsPage.title,
        description: () => {
          const jobs = b.listOf(c.projects.items.map((p) => p.title.toLowerCase()), 3)
          return b.compose([`Recent work from ${place()}${jobs ? `: ${jobs}` : ''}`, c.sections.projectsPage.subtitle])
        },
        image: () => c.photos.about.src || undefined,
        schema: ({ site, path }) => nameListNode(site, path, `Recent work by ${c.brand}`, c.projects.items.map((p) => ({ name: p.title, description: p.blurb, image: p.image }))),
        body: () =>
          b.main(
            b.hero(c.sections.projectsPage.title, c.sections.projectsPage.eyebrow, c.sections.projectsPage.subtitle),
            projectsBody(c.projects.items, c.projects.intro),
            b.photos(c.photos.gallery, c.sections.projectsPage.galleryTitle, 8),
          ),
      },
    },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('./views/ContactView.vue'),
    meta: {
      seo: {
        title: () => c.sections.contact.title,
        description: () =>
          b.compose([
            `Request a written quote from ${c.brand}${c.contact.address ? ` at ${c.contact.address}` : ''}, or call the shop`,
            c.sections.contactPage.subtitle,
          ]),
        body: () =>
          b.main(
            b.hero(c.sections.contactPage.title, c.sections.contactPage.eyebrow, c.sections.contactPage.subtitle),
            dispatchBody(),
            b.contact(c.contact, c.sections.contact.title),
            b.p(c.sections.contact.intro),
            b.hours(c.hours, c.sections.hours.title, c.sections.contactPage.hoursNote),
          ),
      },
    },
  },
]

/** The catch-all: a real not-found page, noindex, never a redirect home. */
export const notFoundRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'not-found',
  component: () => import('./views/NotFoundView.vue'),
  meta: { seo: { title: 'Page not found', description: () => `That page is not on the ${c.brand} website.`, noindex: true } },
}
