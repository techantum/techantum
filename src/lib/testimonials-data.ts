export interface TestimonialItem {
  id: string;
  name: string;
  country: string;
  company: string;
  rating: number;
  date: string;
  service: string;
  text: string;
}

export const testimonialsList: TestimonialItem[] = [
  {
    id: 'test_1',
    name: 'Marcus Schmidt',
    country: 'Germany',
    company: 'Schmidt Digital GmbH',
    rating: 5,
    date: '2024-01-15',
    service: 'Websites',
    text: 'TechAntum rebuilt our corporate website from scratch. The new site loads fast, looks professional, and our lead inquiries increased by 40% within the first month.',
  },
  {
    id: 'test_2',
    name: 'Michael Chen',
    country: 'United States',
    company: 'Chen Analytics',
    rating: 5,
    date: '2024-01-10',
    service: 'Web Applications',
    text: 'Complex data visualization dashboard delivered on time and under budget. The React/Next.js stack they chose was the perfect fit for our needs.',
  },
  {
    id: 'test_3',
    name: 'Priya Sharma',
    country: 'India',
    company: 'Nova Retail India',
    rating: 5,
    date: '2024-01-08',
    service: 'Mobile Applications',
    text: 'Our e-commerce mobile app was delivered on schedule with a polished user experience. TechAntum handled design, development, and store deployment end to end.',
  },
  {
    id: 'test_4',
    name: 'Hans Müller',
    country: 'Germany',
    company: 'Müller FinTech',
    rating: 5,
    date: '2024-01-05',
    service: 'Web Applications',
    text: 'The admin dashboard they built handles thousands of transactions daily without a hitch. Professional team, clear communication, and solid engineering.',
  },
  {
    id: 'test_5',
    name: 'Jennifer Williams',
    country: 'United States',
    company: 'Williams Consulting',
    rating: 5,
    date: '2023-12-28',
    service: 'Websites',
    text: 'Our new portfolio website perfectly showcases our work. TechAntum understood our brand and delivered a site that has impressed every client who visits it.',
  },
  {
    id: 'test_6',
    name: 'Arjun Mehta',
    country: 'India',
    company: 'Mehta Logistics',
    rating: 5,
    date: '2023-12-20',
    service: 'Web Applications',
    text: 'They developed a custom operations platform for our logistics team. The system reduced manual coordination and improved delivery visibility across regions.',
  },
  {
    id: 'test_7',
    name: 'Elena Popov',
    country: 'Germany',
    company: 'Popov Design Studio',
    rating: 5,
    date: '2023-12-15',
    service: 'Websites',
    text: 'Beautiful, minimalist website that loads in under 2 seconds. TechAntum nailed the design and performance optimization. Could not be happier.',
  },
  {
    id: 'test_8',
    name: 'David Thompson',
    country: 'United States',
    company: 'Thompson Health',
    rating: 5,
    date: '2023-12-10',
    service: 'Mobile Applications',
    text: 'The patient booking app they developed is intuitive and reliable. Our users love it and appointment no-shows dropped by 25%. Outstanding work.',
  },
  {
    id: 'test_9',
    name: 'Rahul Kapoor',
    country: 'India',
    company: 'Kapoor FinServe',
    rating: 5,
    date: '2023-11-28',
    service: 'Web Applications',
    text: 'TechAntum built our client onboarding portal with secure authentication and document workflows. Delivery was structured and communication was excellent throughout.',
  },
  {
    id: 'test_10',
    name: 'Sophie Becker',
    country: 'Germany',
    company: 'Becker SaaS',
    rating: 5,
    date: '2023-11-20',
    service: 'Web Applications',
    text: 'We needed a SaaS dashboard for our clients and TechAntum delivered beyond expectations. Clean code, great UX, and excellent post-launch support.',
  },
  {
    id: 'test_11',
    name: 'James Wilson',
    country: 'United States',
    company: 'Wilson Retail',
    rating: 5,
    date: '2023-11-10',
    service: 'Mobile Applications',
    text: 'Cross-platform app for iOS and Android launched simultaneously. One codebase, two platforms, half the cost. Smart approach and flawless execution.',
  },
  {
    id: 'test_12',
    name: 'Ananya Reddy',
    country: 'India',
    company: 'Reddy HealthTech',
    rating: 5,
    date: '2023-10-28',
    service: 'Websites',
    text: 'TechAntum delivered a compliant healthcare website with clear service pages and appointment routing. The project team was responsive and detail-oriented.',
  },
];

export const homepageTestimonials = testimonialsList.slice(0, 4);
