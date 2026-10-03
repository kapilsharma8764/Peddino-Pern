import type { BlockType } from '@/blocks/types'
import type { WidgetSchema, RepeaterField } from './field-types'
import { additionalSchemas } from './additional'
import { functionalSchemas } from './catalogue'
import { iconNames } from '@/blocks/icons'

const extraLinksField: RepeaterField = {
  kind: 'repeater', label: 'Additional links', addLabel: 'Add link', titleKey: 'label',
  help: 'Enter a page name (About), page path (/about), or website address (https://example.com).',
  fields: {
    label: { kind: 'text', label: 'Link name', placeholder: 'Our partner' },
    url: { kind: 'text', label: 'Page or website address', placeholder: 'https://example.com' },
  },
}

/**
 * What each widget lets you change, and what those controls are called.
 *
 * Two rules hold across every schema here:
 *
 * 1. Only declare a field the widget actually renders. A control that quietly
 *    does nothing is worse than a missing one — the user changes it, sees no
 *    effect, and stops trusting the whole panel.
 *
 * 2. Label things the way the person using the builder would say them. The
 *    stored key stays whatever the component expects (`subheadline`,
 *    `ctaText`); the label is plain language ("Supporting text", "Button").
 *
 * `variant` is the exception to key handling: it lives on the block rather
 * than inside props, and the panel special-cases it.
 */
export const widgetSchemas: Record<BlockType, WidgetSchema> = {
  navbar: {
    groups: [
      {
        title: 'Content',
        fields: {
          logo: { kind: 'text', label: 'Business name' },
          logoImage: {
            kind: 'image',
            label: 'Logo',
            help: 'Shown instead of the name when set.',
          },
          links: { kind: 'strings', label: 'Menu items', addLabel: 'Add menu item', help: 'By default the menu follows your pages. Adding or removing an item here turns that off; use the switch below to turn it back on. To hide one page from the menu, untick it in the Pages list instead.' },
          autoPageLinks: { kind: 'switch', label: 'Keep the menu in step with my pages', help: 'New pages appear in the menu by themselves. Turn off to arrange the menu by hand.' },
          extraLinks: extraLinksField,
          ctaUrl: { kind: 'text', label: 'Button destination', placeholder: 'Contact or https://example.com' },
          ctaText: { kind: 'text', label: 'Button', help: 'Leave empty to hide the button.' },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'default', label: 'Logo left, menu right' },
              { value: 'split-center', label: 'Logo left, menu centre, button right' },
              { value: 'centered', label: 'Logo in the middle of the menu' },
              { value: 'stacked', label: 'Logo on top, menu below' },
              { value: 'stacked-pipes', label: 'Logo on top, menu with dividers' },
              { value: 'contact', label: 'Menu, phone and button' },
              { value: 'icons', label: 'Menu with search, account and cart icons' },
              { value: 'burger', label: 'Logo and menu button' },
              { value: 'topbar', label: 'Contact bar above the header' },
            ],
          },
          mobileMenu: {
            kind: 'select',
            label: 'On phones and tablets',
            help: 'What visitors see when the screen is too narrow for the full header.',
            options: [
              { value: 'button', label: 'Fold the menu behind a button' },
              { value: 'links', label: 'Keep all the links showing' },
            ],
          },
          phone: { kind: 'text', label: 'Phone number', help: 'Used by the phone and top-bar styles.' },
          email: { kind: 'text', label: 'Email', help: 'Used by the top-bar style.' },
          topText: { kind: 'text', label: 'Top bar message', help: 'Used by the top-bar style.' },
        },
      },
    ],
  },

  hero: {
    groups: [
      {
        title: 'Content',
        fields: {
          badge: { kind: 'text', label: 'Small label above heading', help: 'Optional. Leave empty to hide.' },
          headline: { kind: 'text', label: 'Heading' },
          subheadline: { kind: 'textarea', label: 'Supporting text', rows: 3 },
          primaryCtaUrl: { kind: 'text', label: 'Main button destination' },
          secondaryCtaUrl: { kind: 'text', label: 'Second button destination' },
          primaryCta: { kind: 'text', label: 'Main button' },
          secondaryCta: { kind: 'text', label: 'Second button', help: 'Optional.' },
          image: {
            kind: 'image',
            label: 'Photo',
            help: 'Used by the photo and side-by-side styles, and shown below the text on the others.',
          },
          imageAlt: { kind: 'text', label: 'Photo description', help: 'Describe the photo for accessibility and search engines.' },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'centered', label: 'Centred' },
              { value: 'split', label: 'Text beside the photo' },
              { value: 'photo', label: 'Photo across the top' },
              { value: 'gradient', label: 'Colour wash' },
              { value: 'minimal', label: 'Words only' },
            ],
          },
        },
      },
    ],
  },

  features: {
    groups: [
      {
        title: 'Content',
        fields: {
          label: { kind: 'text', label: 'Small label', help: 'Optional.' },
          title: { kind: 'text', label: 'Heading' },
          subtitle: { kind: 'text', label: 'Supporting text' },
        },
      },
      {
        title: 'Cards',
        fields: {
          items: {
            kind: 'repeater',
            label: 'Cards',
            addLabel: 'Add card',
            titleKey: 'title',
            fields: {
              // A dropdown rather than a text box: nobody should have to know
              // that the scissors icon is spelled "Scissors".
              icon: {
                kind: 'select',
                label: 'Icon',
                options: iconNames.map((name) => ({
                  value: name,
                  // "HeartPulse" reads as "Heart Pulse" in the list.
                  label: name.replace(/([a-z])([A-Z0-9])/g, '$1 $2'),
                })),
              },
              title: { kind: 'text', label: 'Card heading' },
              description: { kind: 'textarea', label: 'Card text', rows: 2 },
            },
          },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'grid', label: 'Grid of cards' },
              { value: 'list', label: 'Stacked list' },
              { value: 'alternating', label: 'Alternating sides' },
            ],
          },
        },
      },
    ],
  },

  pricing: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          subtitle: { kind: 'text', label: 'Supporting text' },
        },
      },
      {
        title: 'Plans',
        fields: {
          tiers: {
            kind: 'repeater',
            label: 'Plans',
            addLabel: 'Add plan',
            titleKey: 'name',
            fields: {
              name: { kind: 'text', label: 'Plan name' },
              price: { kind: 'text', label: 'Price', placeholder: '₹499' },
              period: { kind: 'text', label: 'Per', placeholder: 'month' },
              description: { kind: 'text', label: 'One-line description' },
              features: { kind: 'strings', label: "What's included", addLabel: 'Add line' },
              cta: { kind: 'text', label: 'Button' },
              featured: { kind: 'switch', label: 'Highlight this plan' },
            },
          },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'simple', label: 'Cards side by side' },
              { value: 'comparison', label: 'Comparison table' },
            ],
          },
        },
      },
    ],
  },

  cta: {
    groups: [
      {
        title: 'Content',
        fields: {
          headline: { kind: 'text', label: 'Heading' },
          subheadline: { kind: 'text', label: 'Supporting text' },
          buttonUrl: { kind: 'text', label: 'Button destination' },
          buttonText: { kind: 'text', label: 'Button' },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'simple', label: 'Centred' },
              { value: 'split', label: 'Text left, button right' },
            ],
          },
        },
      },
    ],
  },

  footer: {
    groups: [
      {
        title: 'Content',
        fields: {
          logo: { kind: 'text', label: 'Business name' },
          logoImage: { kind: 'image', label: 'Logo image', help: 'Optional. Replaces the text above.' },
          copyright: { kind: 'text', label: 'Copyright line' },
          description: { kind: 'text', label: 'Business tagline', help: 'Shown in the multi-column footer.' },
          contactDetails: { kind: 'textarea', label: 'Business contact details' },
          autoPageLinks: { kind: 'switch', label: 'Keep page links automatic', help: 'Updates footer page links when pages change. Turn off before customising link columns.' },
          extraLinks: extraLinksField,
          links: { kind: 'strings', label: 'Links', addLabel: 'Add link' },
        },
      },
      {
        title: 'Columns',
        fields: {
          columns: {
            kind: 'repeater',
            label: 'Link columns',
            help: 'Only used by the multi-column style.',
            addLabel: 'Add column',
            titleKey: 'title',
            fields: {
              title: { kind: 'text', label: 'Column heading' },
              links: { kind: 'strings', label: 'Links', addLabel: 'Add link' },
            },
          },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'simple', label: 'Simple' },
              { value: 'multi-column', label: 'Multiple columns' },
              { value: 'minimal', label: 'Minimal' },
              { value: 'inline', label: 'Logo, links and social in one row' },
              { value: 'centered', label: 'One centred column' },
              { value: 'columns', label: 'Logo with 1 to 4 link columns' },
              { value: 'newsletter', label: 'Newsletter row and link columns' },
            ],
          },
          columnCount: { kind: 'number', label: 'Link columns', min: 1, max: 4, help: 'For the "columns" and "newsletter" styles.' },
        },
      },
    ],
  },

  testimonials: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          subtitle: { kind: 'text', label: 'Supporting text' },
        },
      },
      {
        title: 'Reviews',
        fields: {
          items: {
            kind: 'repeater',
            label: 'Reviews',
            addLabel: 'Add review',
            titleKey: 'name',
            fields: {
              name: { kind: 'text', label: 'Name' },
              role: { kind: 'text', label: 'Role or company' },
              quote: { kind: 'textarea', label: 'What they said', rows: 3 },
              rating: { kind: 'number', label: 'Stars', min: 1, max: 5, step: 1 },
              avatar: { kind: 'image', label: 'Photo' },
            },
          },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'cards', label: 'Cards' },
              { value: 'carousel', label: 'Sliding' },
              { value: 'spotlight', label: 'One at a time' },
            ],
          },
        },
      },
    ],
  },

  stats: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
        },
      },
      {
        title: 'Numbers',
        fields: {
          items: {
            kind: 'repeater',
            label: 'Numbers',
            addLabel: 'Add number',
            titleKey: 'label',
            fields: {
              value: { kind: 'text', label: 'Number', placeholder: '500+' },
              label: { kind: 'text', label: 'What it counts', placeholder: 'Happy customers' },
            },
          },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'grid', label: 'Grid' },
              { value: 'bar', label: 'One row' },
              { value: 'counter', label: 'Large numbers' },
            ],
          },
        },
      },
    ],
  },

  faq: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          subtitle: { kind: 'text', label: 'Supporting text' },
        },
      },
      {
        title: 'Questions',
        fields: {
          items: {
            kind: 'repeater',
            label: 'Questions',
            addLabel: 'Add question',
            titleKey: 'question',
            fields: {
              question: { kind: 'text', label: 'Question' },
              answer: { kind: 'textarea', label: 'Answer', rows: 3 },
            },
          },
        },
      },
    ],
  },

  team: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          subtitle: { kind: 'text', label: 'Supporting text' },
        },
      },
      {
        title: 'People',
        fields: {
          members: {
            kind: 'repeater',
            label: 'People',
            addLabel: 'Add person',
            titleKey: 'name',
            fields: {
              name: { kind: 'text', label: 'Name' },
              role: { kind: 'text', label: 'Role' },
              avatar: { kind: 'image', label: 'Photo' },
            },
          },
        },
      },
    ],
  },

  contact: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          subtitle: { kind: 'text', label: 'Supporting text' },
          nameLabel: { kind: 'text', label: 'Name field label' },
          phoneLabel: { kind: 'text', label: 'Phone field label' },
          emailLabel: { kind: 'text', label: 'Email field label' },
          messageLabel: { kind: 'text', label: 'Message field label' },
          submitLabel: { kind: 'text', label: 'Submit button label' },
        },
      },
    ],
  },

  newsletter: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          subtitle: { kind: 'text', label: 'Supporting text' },
          buttonText: { kind: 'text', label: 'Button' },
          socialProof: { kind: 'text', label: 'Reassurance line', help: 'e.g. "Join 2,000 subscribers"' },
        },
      },
    ],
  },

  logocloud: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          logos: { kind: 'strings', label: 'Company names', addLabel: 'Add company' },
        },
      },
    ],
  },

  content: {
    groups: [
      {
        title: 'Content',
        fields: {
          body: {
            kind: 'textarea',
            label: 'Text',
            rows: 12,
            help: 'Supports Markdown: ## for a heading, **bold**, and - for list items.',
          },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'prose', label: 'Single column' },
              { value: 'columns', label: 'Two columns' },
              { value: 'highlight', label: 'Highlighted box' },
            ],
          },
        },
      },
    ],
  },

  image: {
    groups: [
      {
        title: 'Content',
        fields: {
          src: { kind: 'image', label: 'Photo' },
          alt: { kind: 'text', label: 'Photo description', help: 'Read aloud by screen readers, and shown if the photo fails to load.' },
          title: { kind: 'text', label: 'Heading' },
          subtitle: { kind: 'text', label: 'Supporting text' },
        },
      },
      {
        title: 'Grid photos',
        fields: {
          images: {
            kind: 'repeater',
            label: 'Photos',
            help: 'Only used by the grid style.',
            addLabel: 'Add photo',
            fields: {
              src: { kind: 'image', label: 'Photo' },
              alt: { kind: 'text', label: 'Photo description' },
            },
          },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'hero-image', label: 'Full width' },
              { value: 'side-by-side', label: 'Photo beside text' },
              { value: 'grid', label: 'Grid of photos' },
            ],
          },
          imageSide: {
            kind: 'select',
            label: 'Photo goes',
            options: [
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ],
          },
        },
      },
    ],
  },

  video: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          url: { kind: 'text', label: 'Video link', placeholder: 'https://youtube.com/watch?v=…' },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Where it is hosted',
            options: [
              { value: 'youtube', label: 'YouTube' },
              { value: 'vimeo', label: 'Vimeo' },
            ],
          },
        },
      },
    ],
  },

  gallery: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          images: {
            kind: 'repeater',
            label: 'Photos',
            addLabel: 'Add photo',
            titleKey: 'caption',
            fields: {
              src: { kind: 'image', label: 'Photo' },
              alt: { kind: 'text', label: 'Photo description' },
              caption: { kind: 'text', label: 'Caption' },
            },
          },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'grid', label: 'Even grid' },
              { value: 'masonry', label: 'Staggered' },
            ],
          },
        },
      },
    ],
  },

  map: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          address: {
            kind: 'textarea',
            label: 'Address',
            rows: 3,
            help: 'Shown beside the map, and used to find the location.',
          },
          mapUrl: {
            kind: 'text',
            label: 'Google Maps link',
            placeholder: 'https://maps.google.com/…',
            help: 'Optional. Used only if the address above is empty.',
          },
          timing: { kind: 'text', label: 'Opening hours' },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'full', label: 'Map across the width' },
              { value: 'side-by-side', label: 'Address beside the map' },
            ],
          },
          height: { kind: 'number', label: 'Map height', min: 200, max: 700, step: 20, unit: 'px' },
        },
      },
    ],
  },

  whatsapp: {
    groups: [
      {
        title: 'Content',
        fields: {
          number: {
            kind: 'text',
            label: 'WhatsApp number',
            placeholder: '98765 43210',
            help: 'Spaces and dashes are fine. Leave empty to hide the button.',
          },
          countryCode: { kind: 'text', label: 'Country code', placeholder: '91' },
          label: { kind: 'text', label: 'Button text' },
          message: {
            kind: 'textarea',
            label: 'Opening message',
            rows: 2,
            help: 'Filled in for the visitor when the chat opens.',
          },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'floating', label: 'Floats in the corner' },
              { value: 'inline', label: 'Sits in the page' },
            ],
          },
          side: {
            kind: 'select',
            label: 'Corner',
            options: [
              { value: 'right', label: 'Bottom right' },
              { value: 'left', label: 'Bottom left' },
            ],
          },
        },
      },
    ],
  },

  chart: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          subtitle: { kind: 'text', label: 'Supporting text' },
          items: {
            kind: 'repeater',
            label: 'Numbers',
            addLabel: 'Add a number',
            titleKey: 'label',
            fields: {
              label: { kind: 'text', label: 'What it is', placeholder: 'Repeat customers' },
              value: {
                kind: 'text',
                label: 'Number',
                placeholder: '62%',
                help: 'Write it however you say it — 62%, 1,200 or ₹4.5L all work.',
              },
              color: { kind: 'color', label: 'Bar colour' },
            },
          },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'bars', label: 'Bars across' },
              { value: 'columns', label: 'Columns standing up' },
              { value: 'donut', label: 'Donut with a key' },
            ],
          },
        },
      },
    ],
  },

  slider: {
    groups: [
      {
        title: 'Slides',
        fields: {
          slides: {
            kind: 'repeater',
            label: 'Slides',
            addLabel: 'Add a slide',
            titleKey: 'heading',
            fields: {
              image: { kind: 'image', label: 'Photo' },
              heading: { kind: 'text', label: 'Heading' },
              text: { kind: 'textarea', label: 'Supporting text', rows: 2 },
              buttonText: { kind: 'text', label: 'Button', help: 'Leave empty to hide the button.' },
              buttonUrl: { kind: 'text', label: 'Button goes to', placeholder: '#contact' },
            },
          },
        },
      },
      {
        title: 'Behaviour',
        fields: {
          autoplay: { kind: 'switch', label: 'Change slides on its own' },
          interval: {
            kind: 'number',
            label: 'Seconds per slide',
            min: 2,
            max: 30,
            step: 1,
            unit: 's',
          },
          height: { kind: 'number', label: 'Height', min: 240, max: 900, step: 20, unit: 'px' },
        },
      },
    ],
  },

  products: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          subtitle: { kind: 'text', label: 'Supporting text' },
          items: {
            kind: 'repeater',
            label: 'Items',
            addLabel: 'Add an item',
            titleKey: 'name',
            fields: {
              image: { kind: 'image', label: 'Photo' },
              name: { kind: 'text', label: 'Name' },
              description: { kind: 'textarea', label: 'Description', rows: 2 },
              price: {
                kind: 'text',
                label: 'Price',
                placeholder: '\u20b9499',
                help: 'Write it however you say it \u2014 "\u20b9499", "From \u20b915,000", "On request".',
              },
              badge: { kind: 'text', label: 'Corner label', placeholder: 'New' },
            },
          },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'cards', label: 'Cards with photos' },
              { value: 'list', label: 'Price list' },
            ],
          },
        },
      },
    ],
  },

  hours: {
    groups: [
      {
        title: 'Content',
        fields: {
          title: { kind: 'text', label: 'Heading' },
          rows: {
            kind: 'repeater',
            label: 'Days',
            addLabel: 'Add a day',
            titleKey: 'day',
            fields: {
              day: { kind: 'text', label: 'Day' },
              hours: {
                kind: 'text',
                label: 'Hours',
                placeholder: '9:00 AM - 7:00 PM',
                help: 'Leave empty to show the day as closed.',
              },
            },
          },
          note: { kind: 'text', label: 'Note underneath' },
          highlightToday: { kind: 'switch', label: "Mark today's row" },
        },
      },
    ],
  },

  container: {
    groups: [
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Arrangement',
            options: [
              { value: 'flex', label: 'Row or column' },
              { value: 'grid', label: 'Grid' },
            ],
          },
          direction: {
            kind: 'select',
            label: 'Direction',
            help: 'Side by side, or stacked one above the other.',
            options: [
              { value: 'row', label: 'Side by side' },
              { value: 'column', label: 'Stacked' },
            ],
          },
          columns: {
            kind: 'number',
            label: 'Columns',
            min: 1,
            max: 6,
            help: 'Used when the arrangement is a grid.',
          },
          gap: { kind: 'number', label: 'Space between', min: 0, max: 120 },
          template: {
            kind: 'text',
            label: 'Column widths',
            placeholder: '3fr 7fr',
            help: 'Grid only. For example "3fr 7fr" is a 30 / 70 split, "1fr 1fr 1fr" is three equal columns.',
          },
          stackOnMobile: { kind: 'switch', label: 'One column on phones', help: 'Grid and row layouts stack when the screen is narrow.' },
          tabletColumns: { kind: 'number', label: 'Columns on tablets', min: 1, max: 4, help: 'Set 2 to turn a 3 or 4 column grid into 2 columns on a tablet.' },
          wrap: {
            kind: 'switch',
            label: 'Wrap onto the next line',
            help: 'Off keeps everything on one line, however narrow the screen.',
          },
        },
      },
      {
        title: 'Alignment',
        fields: {
          align: {
            kind: 'select',
            label: 'Across',
            options: [
              { value: 'stretch', label: 'Fill the height' },
              { value: 'start', label: 'Top' },
              { value: 'center', label: 'Middle' },
              { value: 'end', label: 'Bottom' },
            ],
          },
          justify: {
            kind: 'select',
            label: 'Along',
            options: [
              { value: 'start', label: 'Start' },
              { value: 'center', label: 'Centre' },
              { value: 'end', label: 'End' },
              { value: 'between', label: 'Spread apart' },
              { value: 'around', label: 'Evenly spaced' },
            ],
          },
        },
      },
    ],
  },
  divider: {
    groups: [
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'line', label: 'Line' },
              { value: 'space', label: 'Empty space' },
              { value: 'dots', label: 'Dots' },
            ],
          },
          width: {
            kind: 'select',
            label: 'Width',
            options: [
              { value: 'full', label: 'Full width' },
              { value: 'centered', label: 'Centred' },
              { value: 'narrow', label: 'Narrow' },
            ],
          },
          height: { kind: 'number', label: 'Height', min: 0, max: 400, step: 4, unit: 'px' },
        },
      },
    ],
  },

  banner: {
    groups: [
      {
        title: 'Content',
        fields: {
          text: { kind: 'text', label: 'Message' },
          linkText: { kind: 'text', label: 'Link text', help: 'Optional. Leave empty to hide the link.' },
          linkUrl: { kind: 'text', label: 'Link address', placeholder: 'https://…' },
        },
      },
      {
        title: 'Layout',
        fields: {
          variant: {
            kind: 'select',
            label: 'Style',
            options: [
              { value: 'ribbon', label: 'Ribbon' },
              { value: 'bar', label: 'Full-width bar' },
            ],
          },
        },
      },
    ],
  },
  ...additionalSchemas,
  ...functionalSchemas,
}
