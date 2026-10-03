import { lightTheme, type RealTemplate } from '../types'

/**
 * Greenfield Academy — a trust-based school / coaching institute design.
 *
 * Deliberately different from Coursely (the other education template in this
 * library) in palette, typography and section structure: warm and
 * admission-focused rather than cool and SaaS-flavoured, built around
 * programs, facilities, results and a photo gallery rather than course
 * pricing cards. Built entirely from this builder's own widgets, so every
 * page is as editable as a widget dragged onto the canvas by hand.
 */

export const greenfieldAcademy: RealTemplate = {
  id: 'greenfield-academy',
  name: 'Greenfield Academy',
  description: 'School / coaching institute — programs, admissions, gallery and results',
  category: 'education',
  source: 'built-in',

  theme: lightTheme({
    accent: '#1d4e89',
    accentDim: '#123a68',
    bg1: '#fffdf8',
    bg2: '#fbf6ea',
    bg3: '#f3ead9',
    text0: '#1c2430',
    fontSans: 'Nunito Sans',
    fontDisplay: 'Rubik',
    radius: 10,
    radiusLg: 18,
  }),

  header: [
    {
      type: 'navbar',
      variant: 'default',
      props: {
        logo: 'Greenfield Academy',
        links: ['Home', 'About', 'Programs', 'Admission', 'Gallery', 'FAQ', 'Contact'],
        ctaText: 'Apply Now',
      },
    },
  ],

  home: [
    {
      type: 'hero',
      variant: 'photo',
      props: {
        badge: 'Admissions open · 2026–27',
        headline: 'A school where every child is known by name.',
        subheadline:
          'Greenfield Academy has prepared students for board exams, competitive entrances and life beyond the classroom since 1990 — small classes, experienced teachers, and a campus built for learning.',
        primaryCta: 'Apply for Admission',
        secondaryCta: 'Explore Programs',
        image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1400&q=80',
      },
    },
    {
      type: 'stats',
      variant: 'counter',
      props: {
        title: 'Greenfield in numbers',
        items: [
          { value: '2,500+', label: 'Students' },
          { value: '120+', label: 'Teachers' },
          { value: '35', label: 'Years established' },
          { value: '98%', label: 'Board pass rate' },
        ],
      },
    },
    {
      type: 'features',
      variant: 'grid',
      props: {
        label: 'Why families choose us',
        title: 'Everything a growing child needs',
        subtitle: 'From Nursery to Grade 12, we support academic, physical and personal growth in equal measure.',
        items: [
          { icon: 'GraduationCap', title: 'Strong academics', description: 'A CBSE-affiliated curriculum with small classes and regular, honest feedback for parents.' },
          { icon: 'ShieldCheck', title: 'Safe campus', description: 'CCTV, trained staff and strict visitor management across a five-acre campus.' },
          { icon: 'Dumbbell', title: 'Sports & fitness', description: 'Football, cricket, athletics and swimming, coached by trained instructors.' },
          { icon: 'Palette', title: 'Arts & culture', description: 'Music, dance and art with an annual showcase for every grade.' },
        ],
      },
    },
    {
      type: 'features',
      variant: 'alternating',
      props: {
        label: 'Academics',
        title: 'Programs for every stage',
        subtitle: '',
        items: [
          { icon: 'BookOpen', title: 'Primary · Grades 1–5', description: 'Foundations for life — reading, writing and numbers, taught through play and discovery.' },
          { icon: 'FlaskConical', title: 'Middle · Grades 6–8', description: 'Subject teaching begins, with labs, projects and clubs that turn curiosity into understanding.' },
          { icon: 'Target', title: 'Secondary · Grades 9–12', description: 'Focused board preparation with weekly doubt-clearing classes and career counselling.' },
        ],
      },
    },
    {
      type: 'gallery',
      variant: 'grid',
      props: {
        title: 'Life at Greenfield',
        images: [
          { src: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=700&q=75', alt: 'Books stacked on a desk', caption: 'Reading corner' },
          { src: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=700&q=75', alt: 'Student in the library', caption: 'The library' },
          { src: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=700&q=75', alt: 'Students in a classroom lesson', caption: 'Mathematics class' },
          { src: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=700&q=75', alt: 'A teacher with students at the blackboard', caption: 'Primary classroom' },
        ],
      },
    },
    {
      type: 'testimonials',
      variant: 'cards',
      props: {
        title: 'What parents say',
        items: [
          { name: 'Priya Sharma', role: 'Parent of Grade 6', quote: 'My daughter looks forward to school every morning. The teachers genuinely know her, and it shows in her confidence.', rating: 5 },
          { name: 'Rahul Verma', role: 'Alumnus, Class of 2019', quote: 'Greenfield gave me a strong base and mentors I still turn to. The small classes made all the difference.', rating: 5 },
          { name: 'Anita Desai', role: 'Parent of Grade 3', quote: 'Communication with parents is prompt and honest — I always know how my son is doing.', rating: 5 },
        ],
      },
    },
    {
      type: 'cta',
      variant: 'split',
      props: {
        headline: 'Admissions open for 2026–27',
        subheadline: 'Applications are reviewed on a rolling basis — early applicants get first choice of section.',
        buttonText: 'Apply Now',
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
              '## Three decades of growing together\n\nGreenfield Academy began in 1990 with a simple promise: that no child in our neighbourhood should have to choose between a good education and a caring one.\n\nFounded by a group of teachers and parents, the school started with 120 students in a rented building. Today more than 2,500 students learn here, across a five-acre campus with its own labs, library and playing fields — and many of our first-batch students now send their own children to us.\n\nThrough every change, one thing has stayed the same: each child is known by name, and each is expected to do their best.',
          },
        },
        {
          type: 'features',
          variant: 'grid',
          props: {
            label: 'Purpose',
            title: 'Our mission and vision',
            items: [
              { icon: 'Target', title: 'Our mission', description: 'To give every child a strong academic foundation, sound values and the confidence to think for themselves.' },
              { icon: 'Compass', title: 'Our vision', description: 'To graduate curious, compassionate and capable young people who lead with integrity.' },
              { icon: 'HandHeart', title: 'Our values', description: 'Kindness, curiosity, integrity and teamwork — taught as seriously as mathematics.' },
            ],
          },
        },
        {
          type: 'team',
          variant: 'grid',
          props: {
            title: 'School leadership',
            members: [
              { name: 'Dr. Rajesh Malhotra', role: 'Principal · M.Ed., Ph.D. (Education)' },
              { name: 'Mrs. Neha Kapoor', role: 'Vice Principal · Social Science' },
              { name: 'Mrs. Kavita Mehra', role: 'Head of Mathematics' },
              { name: 'Mr. Vikram Chauhan', role: 'Head of Physical Education' },
            ],
          },
        },
        {
          type: 'cta',
          variant: 'simple',
          props: { headline: 'Come and see Greenfield for yourself', subheadline: 'Book a guided campus tour and meet our teachers.', buttonText: 'Book a visit' },
        },
      ],
    },
    {
      name: 'Programs',
      path: '/programs',
      sections: [
        {
          type: 'features',
          variant: 'grid',
          props: {
            label: 'Academics',
            title: 'Programs for every stage',
            subtitle: 'A CBSE-affiliated curriculum that grows with your child, from Grade 1 to Grade 12.',
            items: [
              { icon: 'BookOpen', title: 'Primary · Grades 1–5', description: 'English, Hindi and Mathematics, plus environmental studies, art, music and games every day.' },
              { icon: 'FlaskConical', title: 'Middle · Grades 6–8', description: 'Science, Social Science and Computers begin, alongside a third language and inter-house competitions.' },
              { icon: 'Target', title: 'Secondary · Grades 9–10', description: 'Focused CBSE board preparation with weekly doubt-clearing classes and aptitude counselling.' },
              { icon: 'Rocket', title: 'Senior Secondary · Grades 11–12', description: 'Science, Commerce and Humanities streams, with JEE, NEET and CUET guidance.' },
            ],
          },
        },
        {
          type: 'features',
          variant: 'grid',
          props: {
            label: 'Facilities',
            title: 'Everything under one roof',
            items: [
              { icon: 'BookOpen', title: 'Library', description: '18,000+ books and a quiet reading hall open before and after school.' },
              { icon: 'FlaskConical', title: 'Science labs', description: 'Separate Physics, Chemistry and Biology labs with modern equipment.' },
              { icon: 'Laptop', title: 'Computer lab', description: '60 modern computers with coding and digital-literacy classes.' },
              { icon: 'Dumbbell', title: 'Sports ground', description: 'Football, cricket, basketball and an athletics track.' },
              { icon: 'Truck', title: 'Transport', description: 'GPS-tracked buses with attendants, covering 40+ routes across the city.' },
              { icon: 'HeartPulse', title: 'Medical room', description: 'A full-time nurse and an annual health check-up for every child.' },
            ],
          },
        },
        {
          type: 'cta',
          variant: 'simple',
          props: { headline: 'Find the right program for your child', subheadline: 'Talk to our admissions team about the stage that suits your child.', buttonText: 'Apply now' },
        },
      ],
    },
    {
      name: 'Admission',
      path: '/admission',
      sections: [
        {
          type: 'content',
          variant: 'prose',
          props: { body: '## Admissions 2026–27\n\nJoin a school where every child is known by name. Applications are open for Nursery through Grade 11, and are reviewed on a rolling basis.' },
        },
        {
          type: 'steps',
          variant: 'default',
          props: {
            items: [
              { title: 'Inquiry', body: 'Call, email or visit the admission office to collect the prospectus and learn about seats available.' },
              { title: 'Form submission', body: 'Fill in the application online or at the office, with a non-refundable registration fee of ₹500.' },
              { title: 'Entrance test / interaction', body: 'Grades 2–12: a short written assessment. Nursery to Grade 1: an informal interaction with the child and parents.' },
              { title: 'Document verification', body: 'Shortlisted families bring original documents for verification by the admission committee.' },
              { title: 'Fee payment', body: 'Once selected, pay the admission and first-term fees within 7 days to confirm the seat.' },
              { title: 'Confirmation', body: 'Receive the admission letter, uniform and book list, plus an orientation date for your child.' },
            ],
          },
        },
        {
          type: 'content',
          variant: 'columns',
          props: {
            body:
              '### Eligibility\n\n- **Nursery / LKG / UKG** — age 3+ / 4+ / 5+ years as on 31 March.\n- **Grade 1** — age 6+ years, able to recognise letters and numbers up to 20.\n- **Grades 2–8** — passed the previous class, with a Transfer Certificate.\n- **Grades 9–12** — minimum 60% marks in the previous class.\n\n### Documents required\n\n- Birth certificate (original and photocopy)\n- Transfer Certificate from the previous school (Grade 2 onwards)\n- Report card of the last two years\n- Aadhaar card of the child and both parents\n- 4 recent passport-size photographs',
          },
        },
        {
          type: 'cta',
          variant: 'split',
          props: { headline: 'Start your child’s application', subheadline: 'Our admission team replies within one working day.', buttonText: 'Apply Now' },
        },
      ],
    },
    {
      name: 'Gallery',
      path: '/gallery',
      sections: [
        {
          type: 'content',
          variant: 'prose',
          props: { body: '## Life at Greenfield\n\nCampus, classrooms, sports and celebrations — a look at everyday life at Greenfield Academy.' },
        },
        {
          type: 'gallery',
          variant: 'masonry',
          props: {
            title: 'Photo gallery',
            images: [
              { src: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=700&q=75', alt: 'Books stacked on a desk', caption: 'Reading corner' },
              { src: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=700&q=75', alt: 'Student in the library', caption: 'The library' },
              { src: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=700&q=75', alt: 'Students in a classroom lesson', caption: 'Mathematics class' },
              { src: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=700&q=75', alt: 'A teacher with students at the blackboard', caption: 'Primary classroom' },
              { src: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=700&q=75', alt: 'A modern library interior', caption: 'Reading hall' },
              { src: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&w=700&q=75', alt: 'Children writing at their desks', caption: 'Writing practice' },
            ],
          },
        },
        {
          type: 'cta',
          variant: 'simple',
          props: { headline: 'Want to see it in person?', subheadline: 'Visit the campus and meet our teachers.', buttonText: 'Book a visit' },
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
              { question: 'What are the school hours?', answer: 'Classes run Monday to Saturday, 8:00 AM to 2:00 PM, with the admission office open 8:30 AM to 3:30 PM.' },
              { question: 'Do you provide transport?', answer: 'Yes — GPS-tracked buses with attendants cover more than 40 routes across the city. Route details are shared at admission.' },
              { question: 'Is there a sibling discount?', answer: 'Yes, a 10% concession applies to the tuition fee of the second child enrolled.' },
              { question: 'What documents do I need for admission?', answer: 'Birth certificate, previous report cards, Aadhaar card and passport-size photographs — the full checklist is on the Admission page.' },
              { question: 'Are scholarships available?', answer: 'Merit scholarships are available for Grades 9–12 based on the entrance test and previous academic record.' },
              { question: 'Can I transfer my child mid-year?', answer: 'Yes, subject to seat availability and a Transfer Certificate from the previous school.' },
            ],
          },
        },
        {
          type: 'cta',
          variant: 'simple',
          props: { headline: 'Still have a question?', subheadline: 'Our admission office typically replies within one working day.', buttonText: 'Contact the office' },
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
          props: { title: 'Contact us', subtitle: 'Questions about admissions, fees or a campus visit — send a note and we will reply within one working day.' },
        },
        {
          type: 'map',
          variant: 'side-by-side',
          props: { title: 'Visit our campus', address: '12 Learning Avenue, Model Town, New Delhi 110009', timing: 'Mon – Sat, 8:30 AM – 3:30 PM', height: 360 },
        },
      ],
    },
  ],

  footer: [
    {
      type: 'footer',
      variant: 'multi-column',
      props: {
        logo: 'Greenfield Academy',
        description: 'Nurturing curious minds and confident young people since 1990.',
        copyright: '2026 Greenfield Academy. All rights reserved.',
        autoPageLinks: true,
      },
    },
  ],
}
