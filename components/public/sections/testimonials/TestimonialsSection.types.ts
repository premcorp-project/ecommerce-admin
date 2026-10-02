/**
 * TestimonialsSection types
 */

export interface Testimonial {
    _id: string;
    name: string;
    role: string;
    company: string;
    avatar: string | null;
    industry: string;
    quote: string;
    rating: number;
    isActive: boolean;
    position: number;
}

export interface TestimonialsSectionProps {
    /** Optional override for the section heading */
    title?: string;
}

export interface TestimonialItem {
    id: string;
    rating: number;
    quote: string;
    name: string;
    role: string;
    avatarUrl: string | null;
}
