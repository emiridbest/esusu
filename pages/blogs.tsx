import React from 'react';

interface Post {
    title: string;
    desc: string;
    img: string;
    authorLogo: string;
    authorName: string;
    date: string;
    href: string;
}

const posts: Post[] = [
    {
        title: "What is SaaS? Software as a Service Explained",
        desc: "Going into this journey, I had a standard therapy regimen, based on looking at the research literature. After I saw the movie, I started to ask other people what they did for their anxiety, and some",
        img: "https://images.unsplash.com/photo-1556155092-490a1ba16284?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80",
        authorLogo: "https://api.uifaces.co/our-content/donated/xZ4wg2Xj.jpg",
        authorName: "Sidi dev",
        date: "Jan 4 2022",
        href: "javascript:void(0)"
    },
    {
        title: "Savings Explained",
        desc: "Going into this journey, I had a standard therapy regimen, based on looking at the research literature. After I saw the movie, I started to ask other people what they did for their anxiety, and some",
        img: "https://images.unsplash.com/photo-1556155092-490a1ba16284?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80",
        authorLogo: "https://api.uifaces.co/our-content/donated/xZ4wg2Xj.jpg",
        authorName: "Sidi dev",
        date: "Jan 4 2022",
        href: "javascript:void(0)"
    },
    {
        title: "The Crypto Industry and the Dark Side",
        desc: "Going into this journey, I had a standard therapy regimen, based on looking at the research literature. After I saw the movie, I started to ask other people what they did for their anxiety, and some",
        img: "https://images.unsplash.com/photo-1556155092-490a1ba16284?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80",
        authorLogo: "https://api.uifaces.co/our-content/donated/xZ4wg2Xj.jpg",
        authorName: "Sidi dev",
        date: "Jan 4 2022",
        href: "javascript:void(0)"
    },
];

const Blog: React.FC = () => (
    <section className="mt-12 mx-auto px-4 max-w-screen-xl md:px-8">
        <div className="text-center">
            <h1 className="text-3xl text-gray-800 font-semibold">
                Blog
            </h1>
            <p className="mt-3 text-gray-500">
                Blogs that are loved by the community. Updated every hour.
            </p>
        </div>
        <div className="mt-12 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((item, key) => (
                <article className="max-w-md mx-auto mt-4 shadow-lg border rounded-md duration-300 hover:shadow-sm" key={key}>
                    <a href={item.href}>
                        <img src={item.img} loading="lazy" alt={item.title} className="w-full h-48 rounded-t-md" />
                        <div className="flex items-center mt-2 pt-3 ml-4 mr-2">
                            <div className="flex-none w-10 h-10 rounded-full">
                                <img src={item.authorLogo} className="w-full h-full rounded-full" alt={item.authorName} />
                            </div>
                            <div className="ml-3">
                                <span className="block text-gray-900">{item.authorName}</span>
                                <span className="block text-gray-400 text-sm">{item.date}</span>
                            </div>
                        </div>
                        <div className="pt-3 ml-4 mr-2 mb-3">
                            <h3 className="text-xl text-gray-900">
                                {item.title}
                            </h3>
                            <p className="text-gray-400 text-sm mt-1">{item.desc}</p>
                        </div>
                    </a>
                </article>
            ))}
        </div>
    </section>
);

export default Blog;
