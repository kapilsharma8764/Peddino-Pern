import { lightTheme, type RealTemplate } from '../types'

/**
 * Coursely — a modern SaaS-style online course / e-learning platform.
 *
 * Built entirely from this builder's own widgets (hero, stats, features,
 * pricing, testimonials, team, faq, contact, map, steps) rather than any
 * imported markup, so every heading, photo and card is editable in the
 * editor the same way a hand-placed widget would be. Every page beyond the
 * home page carries real content of its own — no "Write about X here"
 * placeholders — because a template someone opens to evaluate the builder
 * should look finished from the first click.
 */

export const courselyElearning: RealTemplate = {
  id: 'coursely-elearning',
  name: 'Coursely',
  description: 'Online course platform — courses, instructors, pricing and FAQ',
  category: 'education',
  source: 'built-in',

  theme: lightTheme({
    accent: '#4f46e5',
    accentDim: '#3730a3',
    bg2: '#f5f4ff',
    bg3: '#ece9fe',
    fontSans: 'Inter',
    fontDisplay: 'Space Grotesk',
    radius: 14,
    radiusLg: 22,
  }),

  header: [
    {
      type: 'navbar',
      variant: 'default',
      props: {
        logo: 'Coursely',
        links: ['Home', 'Courses', 'Instructors', 'About', 'FAQ', 'Contact'],
        ctaText: 'Browse Courses',
      },
    },
  ],

  home: [
    {
      type: 'hero',
      variant: 'split',
      props: {
        badge: 'Now enrolling · New cohorts monthly',
        headline: 'Learn in-demand skills, taught by people who use them every day.',
        subheadline:
          'Coursely pairs short, practical courses with instructors who still work in the field — so what you learn on Monday you can use at work on Tuesday.',
        primaryCta: 'Explore Courses',
        secondaryCta: 'Meet the instructors',
        image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
      },
    },
    {
      type: 'stats',
      variant: 'counter',
      props: {
        title: 'Trusted by learners worldwide',
        items: [
          { value: '48,000+', label: 'Students enrolled' },
          { value: '120+', label: 'Courses available' },
          { value: '35', label: 'Expert instructors' },
          { value: '4.8/5', label: 'Average rating' },
        ],
      },
    },
    {
      type: 'features',
      variant: 'grid',
      props: {
        label: 'Why Coursely',
        title: 'Built for people who learn by doing',
        subtitle: 'Every course is project-based, mentor-supported and designed to fit around a full-time job.',
        items: [
          { icon: 'Laptop', title: 'Learn on your schedule', description: 'Lifetime access to every lesson, on desktop or mobile, at whatever pace fits your week.' },
          { icon: 'Users', title: 'Taught by practitioners', description: 'Instructors who ship real products, not just slides — office hours included with every course.' },
          { icon: 'Award', title: 'Certificates that count', description: 'A shareable certificate on completion, built around a portfolio project you can show employers.' },
          { icon: 'MessageCircle', title: 'A community that helps', description: 'A private forum for every cohort, where questions get answered within a day, not a week.' },
        ],
      },
    },
    {
      type: 'pricing',
      variant: 'simple',
      props: {
        title: 'Featured courses',
        subtitle: 'A few of the courses our students start with most often.',
        tiers: [
          {
            name: 'Product Design Foundations',
            price: '₹6,999',
            period: '· 6 weeks',
            description: 'Wireframes to a polished prototype, using the tools studios actually use.',
            features: ['24 video lessons', '3 portfolio projects', 'Weekly mentor review'],
            cta: 'View course',
          },
          {
            name: 'Full-Stack Web Development',
            price: '₹11,499',
            period: '· 12 weeks',
            description: 'Build and ship a complete web app, from database to deployment.',
            features: ['60+ lessons', 'Capstone project', 'Career support included'],
            cta: 'View course',
            featured: true,
          },
          {
            name: 'Data Analytics with Python',
            price: '₹8,499',
            period: '· 8 weeks',
            description: 'Clean, analyse and visualise real datasets using Python and SQL.',
            features: ['32 video lessons', '2 dataset projects', 'Weekly office hours'],
            cta: 'View course',
          },
        ],
      },
    },
    {
      type: 'features',
      variant: 'alternating',
      props: {
        label: 'How it works',
        title: 'From enrolling to your first project',
        subtitle: '',
        items: [
          { icon: 'Rocket', title: 'Pick a course and enrol', description: 'Every course starts with a short placement quiz, so lessons match what you already know.' },
          { icon: 'Users', title: 'Learn with a cohort', description: 'You move through the material alongside a small group, with a mentor checking in weekly.' },
          { icon: 'Award', title: 'Ship a portfolio project', description: 'Every course ends with a real project you can put in a portfolio and talk about in interviews.' },
        ],
      },
    },
    {
      type: 'testimonials',
      variant: 'cards',
      props: {
        title: 'What our students say',
        items: [
          { name: 'Ananya Rao', role: 'Product Designer, graduated 2025', quote: 'The mentor feedback each week was worth more than the course fee on its own. I had a portfolio piece I was actually proud of by week four.', rating: 5 },
          { name: 'Karan Mehta', role: 'Full-Stack Developer', quote: 'I went from knowing basic HTML to shipping a deployed app in twelve weeks. The pacing was honest about how much time it takes.', rating: 5 },
          { name: 'Sofia Fernandes', role: 'Data Analyst', quote: 'Office hours were the difference for me — being able to ask a real question and get a real answer the same day.', rating: 4 },
        ],
      },
    },
    {
      type: 'team',
      variant: 'grid',
      props: {
        title: 'Learn from people still doing the work',
        subtitle: 'A few of the instructors teaching this term — see the full list on the Instructors page.',
        members: [
          { name: 'Dr. Meera Nair', role: 'Product Design · ex-Zomato' },
          { name: 'Rohan Kapoor', role: 'Full-Stack Engineering · ex-Razorpay' },
          { name: 'Ishaan Verma', role: 'Data Analytics · ex-Flipkart' },
          { name: 'Priya Subramaniam', role: 'UX Research · ex-Swiggy' },
        ],
      },
    },
    {
      type: 'faq',
      variant: 'accordion',
      props: {
        title: 'Quick questions',
        items: [
          { question: 'Do I need experience to start?', answer: 'No. Every course begins with a short placement quiz and the first two weeks assume no prior background in the topic.' },
          { question: 'Is there a certificate?', answer: 'Yes — a shareable certificate on completion, built around the portfolio project you finish the course with.' },
          { question: 'Can I get a refund?', answer: 'Yes, within the first 7 days of a course if it turns out not to be the right fit. See the FAQ page for the full policy.' },
        ],
      },
    },
    {
      type: 'cta',
      variant: 'simple',
      props: {
        headline: 'Ready to start learning?',
        subheadline: 'Enrolment for the next cohort closes soon — courses fill up faster than the seats mentors can cover.',
        buttonText: 'Browse Courses',
      },
    },
  ],

  pages: [
    {
      name: 'About',
      path: '/about',
      sections: [
        {
          type: 'content',
          variant: 'prose',
          props: {
            body:
              '## Practical courses, taught by practitioners\n\nCoursely started in 2021 with a simple complaint: most online courses are recorded once and never touched again, taught by people who stopped doing the work years ago.\n\nWe do the opposite. Every instructor is still working in the field they teach, every course is rebuilt each year to match how the work is actually done now, and every cohort gets a mentor who answers questions within a day.\n\nWe are not trying to be the biggest course platform. We are trying to be the one where finishing a course actually changes what you can do.',
          },
        },
        {
          type: 'stats',
          variant: 'grid',
          props: {
            title: 'Where we stand today',
            items: [
              { value: '2021', label: 'Founded' },
              { value: '48,000+', label: 'Students taught' },
              { value: '35', label: 'Working instructors' },
              { value: '92%', label: 'Course completion rate' },
            ],
          },
        },
        {
          type: 'features',
          variant: 'grid',
          props: {
            label: 'What we believe',
            title: 'Three rules every course follows',
            items: [
              { icon: 'Target', title: 'Project over theory', description: 'Every module ends with something built, not just a quiz you can guess your way through.' },
              { icon: 'Clock', title: 'Respect for your time', description: 'Courses are scoped to what a working adult can realistically finish, and say so upfront.' },
              { icon: 'ShieldCheck', title: 'Honest outcomes', description: 'We publish real completion and placement numbers, not the best quarter we ever had.' },
            ],
          },
        },
        {
          type: 'cta',
          variant: 'simple',
          props: { headline: 'Curious what a lesson looks like?', subheadline: 'Preview any course before you enrol — no account needed.', buttonText: 'Browse Courses' },
        },
      ],
    },
    {
      name: 'Courses',
      path: '/courses',
      sections: [
        {
          type: 'features',
          variant: 'grid',
          props: {
            label: 'Browse by category',
            title: 'Find your next course',
            items: [
              { icon: 'Palette', title: 'Product Design', description: 'UX research, wireframing, prototyping and design systems.' },
              { icon: 'Code', title: 'Web Development', description: 'Front-end, back-end and full-stack development tracks.' },
              { icon: 'BarChart3', title: 'Data & Analytics', description: 'SQL, Python, dashboards and statistical thinking.' },
              { icon: 'TrendingUp', title: 'Marketing & Growth', description: 'SEO, paid acquisition, content and lifecycle marketing.' },
              { icon: 'Layers', title: 'Product Management', description: 'Roadmaps, discovery, stakeholder alignment and delivery.' },
              { icon: 'Cloud', title: 'Cloud & DevOps', description: 'Deployment, infrastructure and scaling applications.' },
            ],
          },
        },
        {
          type: 'pricing',
          variant: 'comparison',
          props: {
            title: 'All current courses',
            subtitle: 'Every course includes lifetime access, a certificate and weekly mentor office hours.',
            tiers: [
              { name: 'Product Design Foundations', price: '₹6,999', period: '6 weeks', description: 'Wireframes to prototype.', features: ['24 lessons', '3 projects', 'Mentor review'], cta: 'View course' },
              { name: 'Full-Stack Web Development', price: '₹11,499', period: '12 weeks', description: 'Database to deployment.', features: ['60+ lessons', 'Capstone project', 'Career support'], cta: 'View course', featured: true },
              { name: 'Data Analytics with Python', price: '₹8,499', period: '8 weeks', description: 'Real datasets, real answers.', features: ['32 lessons', '2 projects', 'Office hours'], cta: 'View course' },
              { name: 'Growth Marketing Sprint', price: '₹5,499', period: '4 weeks', description: 'SEO, ads and lifecycle basics.', features: ['16 lessons', '1 campaign project', 'Mentor review'], cta: 'View course' },
              { name: 'Product Management Essentials', price: '₹9,999', period: '10 weeks', description: 'From roadmap to release.', features: ['40 lessons', 'Case study project', 'Career support'], cta: 'View course' },
              { name: 'Cloud & DevOps Bootcamp', price: '₹10,499', period: '10 weeks', description: 'Ship and scale with confidence.', features: ['36 lessons', 'Deployment project', 'Office hours'], cta: 'View course' },
            ],
          },
        },
        {
          type: 'faq',
          variant: 'accordion',
          props: {
            title: 'About enrolling',
            items: [
              { question: 'How long do I have access?', answer: 'Every course purchase includes lifetime access to that course’s lessons and any future updates to them.' },
              { question: 'Can I switch courses after starting?', answer: 'Yes — email support within the first two weeks and we will move your enrolment at no extra cost.' },
            ],
          },
        },
      ],
    },
    {
      name: 'Course Detail',
      path: '/course-detail',
      sections: [
        {
          type: 'content',
          variant: 'columns',
          props: {
            body:
              '## Full-Stack Web Development\n\n**12 weeks · Beginner to job-ready · Cohort-based**\n\nBuild and ship a complete web application — a database, an API and a working front end — using the same tools professional teams use every day.\n\nThis course assumes no prior experience beyond basic computer use. By week four you will be comfortable reading and writing JavaScript; by week twelve you will have deployed a real, working application that visitors can actually use.\n\n### What you will build\n\nA full booking application: user accounts, a database, a working API, and a deployed front end — the exact shape of project hiring managers ask about in interviews.',
          },
        },
        {
          type: 'stats',
          variant: 'grid',
          props: {
            title: 'Course at a glance',
            items: [
              { value: '12 weeks', label: 'Duration' },
              { value: 'Beginner', label: 'Starting level' },
              { value: '4,200+', label: 'Students completed' },
              { value: '4.9/5', label: 'Course rating' },
            ],
          },
        },
        {
          type: 'features',
          variant: 'list',
          props: {
            label: 'Curriculum',
            title: 'What each stage covers',
            items: [
              { icon: 'Code', title: 'Weeks 1–3 · Foundations', description: 'HTML, CSS and JavaScript fundamentals, working through small guided exercises.' },
              { icon: 'Layers', title: 'Weeks 4–7 · Front-end', description: 'Building interactive interfaces with a modern framework, from components to state.' },
              { icon: 'Cloud', title: 'Weeks 8–10 · Back-end', description: 'APIs, databases and authentication — the server side of the application.' },
              { icon: 'Rocket', title: 'Weeks 11–12 · Ship it', description: 'Deployment, testing and polishing the capstone project for your portfolio.' },
            ],
          },
        },
        {
          type: 'testimonials',
          variant: 'cards',
          props: {
            title: 'Students who took this course',
            items: [
              { name: 'Karan Mehta', role: 'Completed December 2025', quote: 'This is the course I recommend to every friend who asks how to start in web development. The pacing is honest.', rating: 5 },
              { name: 'Diya Shah', role: 'Completed October 2025', quote: 'The capstone project is genuinely the thing I talk about most in interviews now.', rating: 5 },
            ],
          },
        },
        {
          type: 'cta',
          variant: 'split',
          props: { headline: 'Enrolment for the next cohort is open', subheadline: '₹11,499 · Payment plans available at checkout.', buttonText: 'Enrol now' },
        },
      ],
    },
    {
      name: 'Instructors',
      path: '/instructors',
      sections: [
        {
          type: 'content',
          variant: 'prose',
          props: { body: '## Taught by people still doing the work\n\nEvery Coursely instructor works in the field they teach — most part-time alongside their day job. That is deliberate: what they teach this term is what they are actually doing this term.' },
        },
        {
          type: 'team',
          variant: 'grid',
          props: {
            title: 'Meet the instructors',
            members: [
              { name: 'Dr. Meera Nair', role: 'Product Design · ex-Zomato' },
              { name: 'Rohan Kapoor', role: 'Full-Stack Engineering · ex-Razorpay' },
              { name: 'Ishaan Verma', role: 'Data Analytics · ex-Flipkart' },
              { name: 'Priya Subramaniam', role: 'UX Research · ex-Swiggy' },
              { name: 'Arjun Malhotra', role: 'Growth Marketing · ex-Meesho' },
              { name: 'Neha Choudhary', role: 'Product Management · ex-CRED' },
              { name: 'Vikram Sen', role: 'Cloud & DevOps · ex-Freshworks' },
              { name: 'Ritika Bose', role: 'Front-end Engineering · ex-Postman' },
            ],
          },
        },
        {
          type: 'cta',
          variant: 'simple',
          props: { headline: 'Want to teach with us?', subheadline: 'We are always looking for practitioners who enjoy mentoring.', buttonText: 'Get in touch' },
        },
      ],
    },
    {
      name: 'FAQ',
      path: '/faq',
      sections: [
        {
          type: 'faq',
          variant: 'accordion',
          props: {
            title: 'Frequently asked questions',
            items: [
              { question: 'Do I need experience to start a course?', answer: 'No. Every course begins with a short placement quiz, and the first two weeks assume no prior background in the subject.' },
              { question: 'How much time does a course take each week?', answer: 'Most students spend 6–8 hours a week on lessons and projects, spread across whichever days suit their schedule.' },
              { question: 'Is there a certificate at the end?', answer: 'Yes — a shareable certificate on completion, built around the portfolio project you finish the course with.' },
              { question: 'What if I fall behind my cohort?', answer: 'Lessons stay available for the length of your access, so you can catch up at your own pace; mentor office hours continue regardless of where you are in the material.' },
              { question: 'Can I get a refund?', answer: 'Yes, within the first 7 days of a course, no questions asked. After that, refunds are considered case by case — email support and we will help.' },
              { question: 'Do you offer payment plans?', answer: 'Yes, every course over ₹8,000 can be split into 3 monthly instalments at checkout, at no extra cost.' },
              { question: 'Will this help me get a job?', answer: 'Courses over 8 weeks include career support — resume review and mock interviews — but we do not promise placement, and say so upfront.' },
            ],
          },
        },
        {
          type: 'cta',
          variant: 'simple',
          props: { headline: 'Still have a question?', subheadline: 'Our team typically replies within one working day.', buttonText: 'Contact us' },
        },
      ],
    },
    {
      name: 'Contact',
      path: '/contact',
      sections: [
        {
          type: 'contact',
          variant: 'form',
          props: { title: 'Get in touch', subtitle: 'Questions about a course, a corporate plan, or teaching with us — send a note and we will reply within one working day.' },
        },
        {
          type: 'map',
          variant: 'side-by-side',
          props: { title: 'Our office', address: '4th Floor, Prestige Tech Park, Bengaluru 560103', timing: 'Mon – Fri, 9 AM – 6 PM', height: 360 },
        },
      ],
    },
  ],

  footer: [
    {
      type: 'footer',
      variant: 'multi-column',
      props: {
        logo: 'Coursely',
        description: 'Practical, mentor-supported courses taught by people still doing the work.',
        copyright: '2026 Coursely. All rights reserved.',
        autoPageLinks: true,
      },
    },
  ],
}
