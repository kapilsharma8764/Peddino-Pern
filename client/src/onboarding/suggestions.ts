import type { BusinessProfile, WebsiteCategory } from './profile'

/**
 * Suggested wording for the slogan and the About text.
 *
 * The brief asks for a "suggest" button beside these two fields, because a lot
 * of business owners stall on exactly them — they know their trade and cannot
 * think how to write about it.
 *
 * These are composed here rather than asked of a language model, which keeps
 * the button instant, free, and working without a key. To still read as
 * written for *this* business, the wording is chosen from the trade the owner
 * picked, narrowed further by what the business name says (a "Bella Pizza" and
 * a "Bella Bakery" are both food, but not the same slogan), and woven around the
 * name and the city from the address. It is offered as a starting point to
 * edit, not passed off as something written for them.
 */

interface Trade {
  /** Name keywords that select this trade; `null` marks the category's default. */
  match: RegExp | null
  category: WebsiteCategory
  /** `{name}` and `{place}` are filled in; a slogan without them stands alone. */
  slogans: string[]
  /** One paragraph. `{name}` is the business, `{in}` is " in <city>" or empty. */
  about: string
  points: string[]
}

const TRADES: Trade[] = [
  // ── Education ────────────────────────────────────────────────
  {
    match: /school|vidyalaya|convent|public school|academy school|kindergarten|playschool|nursery/i,
    category: 'education',
    slogans: [
      'Where every student is known by name.',
      'Curious minds, confident students.',
      '{name}: growing students, building character.',
      'Learning that goes well beyond the classroom.',
    ],
    about:
      '{name} is a school{in} where every student is known by name. Our teachers care about how children think, not only what they score, and we work closely with parents so nobody is ever left guessing how their child is doing.',
    points: ['Caring, qualified teachers', 'Sports, arts and activities alongside academics', 'Regular parent–teacher updates', 'A safe, well-kept campus'],
  },
  {
    match: /coaching|classes|tuition|institute|iit|neet|jee|upsc|study|tutorial|career/i,
    category: 'education',
    slogans: [
      'Small batches. Senior teachers. Real results.',
      '{name}: where doubts get answered the same day.',
      'Every student taught, not just every class covered.',
      'Prepare with people who have done it before.',
    ],
    about:
      '{name} helps students{in} prepare with clarity and confidence. Batches are kept small so every student gets attention, tests are regular, and doubts are cleared the same week — not left to pile up before the exam.',
    points: ['Small batches with individual attention', 'Weekly tests and honest feedback', 'Doubt-clearing sessions through the week', 'Study material included'],
  },
  {
    match: /online|e-?learn|course|academy|skill|training|learn|edu ?tech|lms/i,
    category: 'education',
    slogans: [
      'Learn a skill. Change your career.',
      '{name}: courses students actually finish.',
      'Learn at your pace, from people who do the work.',
      'Practical courses, real projects, real jobs.',
    ],
    about:
      '{name} teaches practical skills students can use the week they learn them. Our courses are built around real projects, taught by people who work in the field, and designed to be finished — with support if you get stuck.',
    points: ['Project-based courses', 'Instructors from the industry', 'Learn on your own schedule', 'Certificate on completion'],
  },
  {
    match: null,
    category: 'education',
    slogans: [
      'Teaching that stays with you long after the exam.',
      'Where questions matter more than answers.',
      '{name}: every student taught, not just every class covered.',
      'Good teachers. Curious students. Real results.',
    ],
    about:
      '{name} has been teaching students{in} for years. Classes are kept small, so every student gets attention and every parent knows exactly how their child is doing.',
    points: ['Small batches with individual attention', 'Regular tests and honest feedback', 'Doubt sessions through the week'],
  },

  // ── Food & Dining ────────────────────────────────────────────
  {
    match: /cafe|café|coffee|chai|\btea\b|brew|espresso/i,
    category: 'food',
    slogans: [
      'Good coffee. Better company.',
      '{name}: your corner for a slow morning.',
      'Freshly brewed, never rushed.',
      'Come for the coffee, stay for the conversation.',
    ],
    about:
      '{name} is a café{in} built around good coffee and unhurried conversation. We brew fresh, bake in small batches, and keep a table free for anyone who wants to stay a while.',
    points: ['Freshly ground, freshly brewed', 'Baked and made daily', 'Free Wi-Fi and a quiet corner', 'Takeaway and dine-in'],
  },
  {
    match: /bakery|bake|cake|pastry|sweet|mithai|dessert|confection/i,
    category: 'food',
    slogans: [
      'Baked fresh, every single morning.',
      '{name}: made with butter, not shortcuts.',
      'Cakes for the moments worth celebrating.',
      'Sweet things, made properly.',
    ],
    about:
      '{name} is a bakery{in} where everything is baked fresh each morning. We use real butter and honest ingredients, and we make custom cakes for birthdays, weddings and every occasion worth marking.',
    points: ['Baked fresh every morning', 'Custom cakes made to order', 'No artificial flavours', 'Delivery for bulk and event orders'],
  },
  {
    match: /catering|caterer|tiffin|cloud kitchen|meal box/i,
    category: 'food',
    slogans: [
      'Food your guests will talk about.',
      '{name}: from ten plates to a thousand.',
      'Cooked fresh, delivered on time.',
      'We handle the food, you enjoy the day.',
    ],
    about:
      '{name} cooks for weddings, offices and family gatherings{in}. Menus are planned with you, food is cooked fresh on the day, and it reaches your table hot and on time — whatever the size of the event.',
    points: ['Custom menus for every budget', 'Cooked fresh on the day', 'Trained serving staff', 'Reliable on-time delivery'],
  },
  {
    match: /pizza|burger|fast ?food|momo|\brolls?\b|sandwich|shawarma|fries/i,
    category: 'food',
    slogans: [
      'Hot, fresh and on its way.',
      '{name}: the one you order twice a week.',
      'Made to order. Never made to wait.',
      'Big flavour, fair price.',
    ],
    about:
      '{name} serves fresh, made-to-order food{in} without the long wait. Every order is cooked when you place it, with ingredients we would happily serve our own families.',
    points: ['Made fresh to order', 'Quick delivery and easy pickup', 'Generous portions, fair prices', 'Vegetarian options on every menu'],
  },
  {
    match: null,
    category: 'food',
    slogans: [
      'Cooked fresh, served with care.',
      '{name}: a table is always waiting for you.',
      'Real food, made properly.',
      'The kind of meal you come back for.',
    ],
    about:
      '{name} is a restaurant{in} that cooks everything fresh, from recipes we have refined over the years. Come with family or friends — we will make sure the food is hot, the service is warm, and you leave wanting to return.',
    points: ['Fresh ingredients, cooked daily', 'Warm, friendly service', 'Family-friendly seating', 'Dine-in, takeaway and delivery'],
  },

  // ── Beauty & Salon ───────────────────────────────────────────
  {
    match: /spa|massage|wellness|ayurved|therapy|relax/i,
    category: 'beauty',
    slogans: [
      'Take an hour. Take it back.',
      '{name}: where you finally switch off.',
      'Quiet rooms. Skilled hands.',
      'Relax properly. You have earned it.',
    ],
    about:
      '{name} is a spa{in} made for switching off. Trained therapists, calm rooms and treatments matched to what your body needs — so you leave lighter than you arrived.',
    points: ['Trained, experienced therapists', 'Calm, spotless treatment rooms', 'Treatments tailored to you', 'Packages for couples and groups'],
  },
  {
    match: /barber|men'?s|gents|groom|shave|beard/i,
    category: 'beauty',
    slogans: [
      'A sharp cut, every time.',
      '{name}: walk in tired, walk out sharp.',
      'Classic cuts, clean shaves.',
      'Grooming done properly.',
    ],
    about:
      '{name} is a barbershop{in} for men who want a sharp, clean look. Experienced barbers, spotless tools, and a cut that is right the first time.',
    points: ['Haircuts, shaves and beard styling', 'Sterilised tools for every customer', 'No long waits with easy booking', 'Experienced barbers'],
  },
  {
    match: null,
    category: 'beauty',
    slogans: [
      'Look good. Feel even better.',
      '{name}: the salon you tell your friends about.',
      'Where you walk out feeling like yourself, only better.',
      'Skilled hands, honest advice.',
    ],
    about:
      '{name} is a salon{in} that treats every customer as a regular. Our stylists listen first, then advise honestly — so you get a look that suits you, using products we trust.',
    points: ['Experienced, trained stylists', 'Quality, skin-friendly products', 'Hair, skin and bridal services', 'Easy appointment booking'],
  },

  // ── Fitness & Sports ─────────────────────────────────────────
  {
    match: /yoga|pilates|zumba|dance|meditat/i,
    category: 'fitness',
    slogans: [
      'Breathe. Stretch. Begin again.',
      '{name}: strength, calm and flexibility.',
      'A practice that fits your life.',
      'Come as you are. Leave lighter.',
    ],
    about:
      '{name} is a studio{in} for people who want to feel better in their body. Certified teachers, classes for every level, and a welcoming room where nobody is judged for starting from zero.',
    points: ['Certified, experienced instructors', 'Classes for beginners to advanced', 'Small groups and personal sessions', 'Morning and evening batches'],
  },
  {
    match: /academy|cricket|football|badminton|swim|tennis|sport|coach|martial|karate|boxing/i,
    category: 'fitness',
    slogans: [
      'Train like it matters.',
      '{name}: where young players become champions.',
      'Skills built one session at a time.',
      'Discipline today. Confidence for life.',
    ],
    about:
      '{name} is a sports academy{in} that builds skill and discipline together. Trained coaches, structured batches by age and level, and regular progress reviews for every player.',
    points: ['Qualified, experienced coaches', 'Batches by age and skill level', 'Regular fitness and progress reviews', 'Well-kept ground and equipment'],
  },
  {
    match: null,
    category: 'fitness',
    slogans: [
      'Stronger every week.',
      '{name}: your goals, our full attention.',
      'No shortcuts. Just results.',
      'Show up. We will handle the rest.',
    ],
    about:
      '{name} is a gym{in} for people who are serious about getting stronger, or just getting started. Modern equipment, trainers who actually watch your form, and a plan built around your goals.',
    points: ['Modern, well-maintained equipment', 'Certified personal trainers', 'Diet and workout plans', 'Flexible monthly memberships'],
  },

  // ── Health & Clinic ──────────────────────────────────────────
  {
    match: /dental|dentist|teeth|smile|orthodont/i,
    category: 'health',
    slogans: [
      'Healthy teeth. Honest advice.',
      '{name}: dentistry without the dread.',
      'A smile you are happy to show.',
      'Gentle care for the whole family.',
    ],
    about:
      '{name} is a dental clinic{in} where nervous patients feel at ease. We explain every treatment before we begin, keep it as painless as possible, and price it clearly, so there are no surprises.',
    points: ['Gentle, painless treatment', 'Modern, sterilised equipment', 'Clear costs explained upfront', 'Care for children and adults'],
  },
  {
    match: /diagnostic|pathology|\blabs?\b|scan|imaging|x-?ray|blood test/i,
    category: 'health',
    slogans: [
      'Accurate results. On time.',
      '{name}: reports you and your doctor can trust.',
      'Testing you can rely on.',
      'Fast, careful, accurate.',
    ],
    about:
      '{name} is a diagnostic centre{in} where accuracy comes first. Modern equipment, trained technicians and reports delivered on time — with home sample collection when you cannot come in.',
    points: ['Accurate, quality-checked reports', 'Home sample collection', 'Reports online, on time', 'Wide range of tests under one roof'],
  },
  {
    match: /\beye|optical|vision|\bent\b|skin|derma|physio|ortho|child|pediatric|homeo|ayush|polyclinic|hospital/i,
    category: 'health',
    slogans: [
      'Specialist care, close to home.',
      '{name}: doctors who take the time to listen.',
      'Care that starts with listening.',
      'Your health, in experienced hands.',
    ],
    about:
      '{name} provides specialist care{in} from doctors who take the time to listen. We explain your condition plainly, recommend only what you need, and follow up so you are never left wondering what happens next.',
    points: ['Experienced, qualified doctors', 'Clear explanation of every treatment', 'Modern, hygienic facilities', 'Easy appointment booking'],
  },
  {
    match: null,
    category: 'health',
    slogans: [
      'Care you can trust, close to home.',
      '{name}: doctors who take the time to listen.',
      'Your health, in experienced hands.',
      'Caring for families, generation after generation.',
    ],
    about:
      '{name} is a clinic{in} that looks after families across generations. Our doctors take time to listen, explain clearly and treat only what needs treating — with follow-up you can count on.',
    points: ['Experienced, qualified doctors', 'Clear, honest advice', 'Clean, comfortable clinic', 'Appointments without the long wait'],
  },

  // ── Real Estate ──────────────────────────────────────────────
  {
    match: null,
    category: 'realestate',
    slogans: [
      'Find the place you will call home.',
      '{name}: honest advice on the biggest decision you make.',
      'Verified properties. Clear paperwork.',
      'From first visit to final keys.',
    ],
    about:
      '{name} helps families buy, sell and rent property{in} with honest advice and clear paperwork. Every listing is verified, every price explained, and we stay with you from the first visit until you hold the keys.',
    points: ['Verified listings only', 'Clear, transparent pricing', 'Help with paperwork and registration', 'Site visits at your convenience'],
  },

  // ── Home & Construction ──────────────────────────────────────
  {
    match: /interior|design|decor|furnish|modular|kitchen|wardrobe/i,
    category: 'home-services',
    slogans: [
      'Homes that look like you.',
      '{name}: designed around the way you live.',
      'Beautiful, practical, on budget.',
      'Your space, done properly.',
    ],
    about:
      '{name} designs interiors{in} around the way you actually live. We plan the space with you, agree the budget upfront, and manage the work from first sketch to final touch-up.',
    points: ['Free design consultation', 'Fixed, written quotation', 'Quality materials and finish', 'On-time project delivery'],
  },
  {
    match: /solar|energy|power|electric|inverter|panel/i,
    category: 'home-services',
    slogans: [
      'Cut your electricity bill. Keep the sunshine.',
      '{name}: clean power that pays for itself.',
      'Solar installed properly, supported for years.',
      'Switch to the sun.',
    ],
    about:
      '{name} installs solar systems{in} that genuinely lower electricity bills. We size the system to your usage, use quality panels, handle the paperwork, and stay available long after installation.',
    points: ['Free site survey and system sizing', 'Quality panels with warranty', 'Subsidy and paperwork support', 'After-sales service and maintenance'],
  },
  {
    match: /clean|pest|plumb|repair|service|maintenance|paint|\bac\b|car wash|laundry/i,
    category: 'home-services',
    slogans: [
      'On time. Done right. Every time.',
      '{name}: the job finished, not just started.',
      'Trained people who turn up when they say.',
      'Your home, looked after.',
    ],
    about:
      '{name} looks after homes{in} with trained, background-checked staff who turn up when they say they will. You get a clear quote before work starts and a proper finish when it ends.',
    points: ['Trained, background-checked staff', 'Clear quote before we begin', 'On-time, tidy work', 'We return if anything is not right'],
  },
  {
    match: null,
    category: 'home-services',
    slogans: [
      'Built properly. Finished on time.',
      '{name}: careful work from people who turn up.',
      'Quality you can see, prices you can plan around.',
      'The job done right the first time.',
    ],
    about:
      '{name} builds and renovates homes{in} with honest quotes and careful work. We keep you informed at every stage, use quality materials, and finish when we said we would.',
    points: ['Free site visit and written quote', 'Quality materials and skilled workers', 'Regular progress updates', 'Warranty on completed work'],
  },

  // ── Professional Services ────────────────────────────────────
  {
    match: /software|\btech|\bit\b|digital|\bweb|\bapps?\b|\bdev|cloud|cyber|\bdata|\bai\b|\blabs?\b|systems|solutions|studio|agency|marketing|media/i,
    category: 'professional',
    slogans: [
      'Software that works. Support that answers.',
      '{name}: we build what your business needs.',
      'Technology, made simple.',
      'Ideas shipped, not just discussed.',
    ],
    about:
      '{name} builds websites, apps and software{in} for businesses that want results, not jargon. We start by understanding your goals, agree the scope and price clearly, and keep you updated until it is live — and after.',
    points: ['Clear scope and fixed pricing', 'Regular progress updates', 'Clean, maintainable work', 'Support after launch'],
  },
  {
    match: /law|legal|advocate|attorney|associates|chambers|notary/i,
    category: 'professional',
    slogans: [
      'Clear advice when it matters most.',
      '{name}: your case, handled with care.',
      'Straight answers. Serious representation.',
      'Legal help you can understand.',
    ],
    about:
      '{name} provides legal advice and representation{in}. We explain your options in plain language, tell you honestly where you stand, and handle every matter with the care it deserves.',
    points: ['Plain-language legal advice', 'Honest assessment of your case', 'Experienced advocates', 'Confidential consultations'],
  },
  {
    match: /\bca\b|chartered|account|tax|audit|gst|finance|financial|wealth|insurance|invest/i,
    category: 'professional',
    slogans: [
      'Your numbers, in order.',
      '{name}: taxes, accounts and peace of mind.',
      'Accurate. On time. Compliant.',
      'Finance made clear.',
    ],
    about:
      '{name} handles accounts, tax and compliance{in} so business owners can focus on the business. Filings go in on time, advice is clear, and you always know where you stand.',
    points: ['Accounting, GST and income tax filing', 'Deadlines never missed', 'Clear, honest advice', 'Dedicated point of contact'],
  },
  {
    match: null,
    category: 'professional',
    slogans: [
      'Straight answers and careful work.',
      '{name}: doing one thing, and doing it well.',
      'Trusted by the businesses that know us best.',
      'Experience you can rely on.',
    ],
    about:
      '{name} works with businesses{in} that value straight answers and careful work. Most of our clients come through recommendations, which we take as the best compliment we could earn.',
    points: ['Experienced team', 'Clear scope and pricing', 'Prompt, honest communication', 'Long-term clients who keep coming back'],
  },
]

/** Used when no category has been picked yet, or "Something else" was chosen. */
const GENERAL: Omit<Trade, 'match' | 'category'>[] = [
  {
    slogans: [
      'Trusted by the people who know us best.',
      '{name}: straight answers and careful work.',
      'The people your neighbours recommend.',
      'Doing one thing, and doing it well.',
    ],
    about:
      '{name} has served customers{in} for years, and most of our work now comes from people we have already looked after. We think that says more than anything we could write.',
    points: ['Years of experience', 'Clear, fair pricing', 'Most customers come back'],
  },
]

const PRODUCT_GENERAL: Omit<Trade, 'match' | 'category'> = {
  slogans: [
    'Made properly, priced fairly.',
    '{name}: built to last longer than the warranty.',
    'The quality you would choose for yourself.',
    'Honest materials, careful work.',
  ],
  about:
    '{name} makes and sells products{in} we would be happy to use ourselves. We choose materials carefully, price them honestly, and stand behind everything that leaves our hands.',
  points: ['Carefully chosen materials', 'Fair, clearly stated prices', 'Replacement if anything is wrong'],
}

/** The city, taken from the tail of the address ("…, Sector 5, Jaipur, 302001" → "Jaipur"). */
function placeFrom(profile: BusinessProfile): string {
  const parts = profile.contact.address
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter((part) => part && !/^\d+$/.test(part) && !/\d{5,}/.test(part))
  const last = parts[parts.length - 1]
  return last && last.length <= 30 ? last : ''
}

function tradeFor(profile: BusinessProfile): Omit<Trade, 'match' | 'category'> {
  const { category, offer, name } = profile
  if (category && category !== 'other') {
    const inCategory = TRADES.filter((trade) => trade.category === category)
    const byName = name.trim() ? inCategory.find((trade) => trade.match && trade.match.test(name)) : undefined
    const fallback = inCategory.find((trade) => trade.match === null)
    if (byName ?? fallback) return (byName ?? fallback) as Trade
  }
  if (offer === 'product') return PRODUCT_GENERAL
  return GENERAL[0]
}

function fill(text: string, name: string, place: string): string {
  return text
    .replace(/\{name\}/g, name)
    .replace(/\{in\}/g, place ? ` in ${place}` : '')
    .replace(/\{place\}/g, place)
}

export function suggestSlogans(profile: BusinessProfile): string[] {
  const name = profile.name.trim() || 'Our business'
  const place = placeFrom(profile)
  // With no name yet, "{name}: …" would read "We: …", so keep only the stand-alone lines.
  const usable = tradeFor(profile).slogans.filter((slogan) => profile.name.trim() || !slogan.includes('{name}'))
  return usable.map((slogan) => fill(slogan, name, place))
}

/** A first draft of the About section, in Markdown, ready to be edited. */
export function suggestAbout(profile: BusinessProfile): string {
  const trade = tradeFor(profile)
  const name = profile.name.trim() || 'Our business'
  const place = placeFrom(profile)
  const points = trade.points.map((point) => `- ${point}`).join('\n')

  return `## About us\n\n${fill(trade.about, name, place)}\n\n${points}`
}
