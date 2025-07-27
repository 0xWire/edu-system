export default function About () {
    return (
        <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
        <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
            <h1 className="text-2xl font-bold">About Us</h1>
            <p className="text-lg">
            Welcome to our educational platform! We are dedicated to providing high-quality learning resources and experiences.
            </p>
        </main>
        <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
            <a
            className="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="https://example.com"
            target="_blank"
            rel="noopener noreferrer"
            >
            Visit our website
            </a>
        </footer>
        </div>
    );
}