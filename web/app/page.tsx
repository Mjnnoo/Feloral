export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* HEADER */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-yellow-400">FELORAL</h1>

        <div className="flex gap-6 text-sm text-gray-300">
          <span>Home</span>
          <span>Shop</span>
          <span>Brands</span>
          <span>Contact</span>
        </div>

        <div className="flex gap-4 text-sm">
          <span>🔍</span>
          <span>🛒</span>
          <span>Login</span>
        </div>
      </header>

      {/* HERO */}
      <section className="text-center py-24 px-6">
        <h2 className="text-5xl font-bold mb-6">
          Discover Your Signature Scent
        </h2>

        <p className="text-gray-400 mb-8">
          Luxury perfumes crafted for your personality
        </p>

        <button className="bg-yellow-500 text-black px-8 py-3 rounded-full font-semibold">
          Shop Now
        </button>
      </section>

      {/* CATEGORIES */}
      <section className="px-8 py-12">
        <h3 className="text-xl mb-6">Categories</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["Men", "Women", "Unisex", "Luxury"].map((item) => (
            <div
              key={item}
              className="bg-gray-900 p-6 rounded-xl text-center hover:bg-gray-800"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="px-8 py-12">
        <h3 className="text-xl mb-6">Featured Perfumes</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="bg-gray-900 p-4 rounded-xl"
            >
              <div className="h-40 bg-gray-800 rounded mb-4"></div>
              <h4 className="font-semibold">Perfume Name</h4>
              <p className="text-sm text-gray-400">Luxury scent</p>
              <p className="text-yellow-400 mt-2">$120</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center text-gray-500 py-10 border-t border-gray-800 mt-10">
        © 2026 Feloral. All rights reserved.
      </footer>

    </main>
  );
}