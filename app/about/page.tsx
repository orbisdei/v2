import Link from 'next/link';
import Header from '@/components/Header';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="font-serif text-3xl font-bold text-navy-900 mb-6">
          About Orbis Dei
        </h1>

        <p className="text-gray-700 leading-relaxed mb-4">
          The seeds of this site were planted in Lent 2023, during a founder's reflection during
          eucharistic adoration. Already a seasoned traveler, he had lately begun to place an
          emphasis on visiting holy sites during his trips, and was continuously surprised at how
          many he discovered. The idea of a unified map complementing existing Catholic resources
          such as{' '}
          <a href="https://masstimes.org/" target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:text-navy-500 underline underline-offset-2">Mass Times</a>
          {' '}and{' '}
          <a href="http://www.gcatholic.org/" target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:text-navy-500 underline underline-offset-2">GCatholic</a>
          {' '}was born and took shape over the next few months.
        </p>

        <p className="text-gray-700 leading-relaxed mb-4">
          Our Lord tells us, "Blessed are those who have not seen and have believed" (
          <a href="https://bible.usccb.org/bible/john/20" target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:text-navy-500 underline underline-offset-2">Jn 20:29</a>
          ). As we strive to reach this ideal, the authors' hope is that this website helps the
          faithful connect with tangible testaments to our Christian faith. This "World of God"
          invites us to visit, pray and reflect at holy sites — on the virtues of the saints who
          trod there, on the messages of our Blessed Mother, and ultimately on how we may grow
          closer to Christ.
        </p>

        <p className="text-gray-500 italic mb-8">
          Dedicated on the Solemnity of the Assumption, 15 August 2023
        </p>

        {/* The Name */}
        <h2 className="font-serif text-xl font-bold text-navy-900 mt-8 mb-2">The Name</h2>
        <p className="text-gray-700 leading-relaxed mb-6">
          Orbis Dei is Latin for "World of God."
        </p>

        {/* Tenets */}
        <h2 className="font-serif text-xl font-bold text-navy-900 mt-8 mb-3">Tenets</h2>
        <ul className="flex flex-col gap-3 mb-8">
          <li className="text-gray-700 leading-relaxed flex gap-2">
            <span className="text-navy-400 shrink-0">•</span>
            <span>
              A location must be <strong>definitively identifiable and specific</strong> to be
              listed. As an example: Bl. Stanley Rother was born in Okarche, Oklahoma, USA — a
              small town of just over 1000 people. His childhood home is not listed without a
              specific address, but his{' '}
              <Link href="/site/us-okarche-holy-trinity-catholic-church-okarche-ok" className="text-navy-700 hover:text-navy-500 underline underline-offset-2">
                home parish
              </Link>
              {' '}is.
            </span>
          </li>
          <li className="text-gray-700 leading-relaxed flex gap-2">
            <span className="text-navy-400 shrink-0">•</span>
            <span>
              This website is intended to <strong>not be a primary source of information</strong>{' '}
              beyond the physical location of sites. A summary of each location is provided, but
              wherever possible we have linked to sources which provide richer detail. If you
              believe one of the linked sources to be incorrect, or have additional links to add,
              please{' '}
              <a href="mailto:contact@orbisdei.org" className="text-navy-700 hover:text-navy-500 underline underline-offset-2">
                contact us
              </a>
              .
            </span>
          </li>
          <li className="text-gray-700 leading-relaxed flex gap-2">
            <span className="text-navy-400 shrink-0">•</span>
            <span>
              We believe strongly in <strong>shared contributions</strong>; many pages have been
              created by individuals who had a personal connection to their topics. If you feel
              called to author content, please{' '}
              <a href="mailto:contact@orbisdei.org" className="text-navy-700 hover:text-navy-500 underline underline-offset-2">
                contact us
              </a>
              {' '}and we would love to get in touch.
            </span>
          </li>
        </ul>

        {/* Recommended Sites */}
        <h2 className="font-serif text-xl font-bold text-navy-900 mt-8 mb-3">Recommended Sites</h2>

        <h3 className="font-semibold text-navy-800 mb-2">Mapped Locations</h3>
        <ul className="flex flex-col gap-2 mb-6">
          <li className="text-gray-700 leading-relaxed flex gap-2">
            <span className="text-navy-400 shrink-0">•</span>
            <span>
              <a href="https://masstimes.org/" target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:text-navy-500 underline underline-offset-2 font-medium">Mass Times</a>
              : A database of Catholic church locations and their services
            </span>
          </li>
          <li className="text-gray-700 leading-relaxed flex gap-2">
            <span className="text-navy-400 shrink-0">•</span>
            <span>
              <a href="http://www.gcatholic.org/" target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:text-navy-500 underline underline-offset-2 font-medium">GCatholic</a>
              : A wide-ranging collection of information about the Catholic church, including
              mapped locations. Sample pages:
              <ul className="mt-1.5 ml-4 flex flex-col gap-1">
                <li className="flex gap-2">
                  <span className="text-navy-400 shrink-0">–</span>
                  <a href="http://www.gcatholic.org/churches/list/Apostles.htm" target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:text-navy-500 underline underline-offset-2">Tombs of Apostles and Evangelists</a>
                </li>
                <li className="flex gap-2">
                  <span className="text-navy-400 shrink-0">–</span>
                  <a href="http://www.gcatholic.org/orders/churches/002.htm" target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:text-navy-500 underline underline-offset-2">Franciscan Churches</a>
                </li>
              </ul>
            </span>
          </li>
        </ul>

        <h3 className="font-semibold text-navy-800 mb-2">Other Sources</h3>
        <ul className="flex flex-col gap-2">
          <li className="text-gray-700 leading-relaxed flex gap-2">
            <span className="text-navy-400 shrink-0">•</span>
            <span>
              <a href="https://www.miraclehunter.com/" target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:text-navy-500 underline underline-offset-2 font-medium">Miracle Hunter</a>
              : The primary source used for{' '}
              <Link href="/tag/marian-sites" className="text-navy-700 hover:text-navy-500 underline underline-offset-2">our list of Marian apparitions</Link>
            </span>
          </li>
          <li className="text-gray-700 leading-relaxed flex gap-2">
            <span className="text-navy-400 shrink-0">•</span>
            <span>
              <a href="http://therealpresence.org/" target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:text-navy-500 underline underline-offset-2 font-medium">The Real Presence</a>
              , specifically{' '}
              <a href="http://therealpresence.org/eucharst/misc/bvm.htm" target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:text-navy-500 underline underline-offset-2">their list of Marian apparitions and shrines</a>
              : A beautifully researched and illustrated compilation based on the work started by
              Bl. Carlo Acutis just before his death
            </span>
          </li>
          <li className="text-gray-700 leading-relaxed flex gap-2">
            <span className="text-navy-400 shrink-0">•</span>
            <span>
              <a href="https://www.marypages.com/" target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:text-navy-500 underline underline-offset-2 font-medium">Mary Pages</a>
              : An additional source for several Marian apparitions
            </span>
          </li>
          <li className="text-gray-700 leading-relaxed flex gap-2">
            <span className="text-navy-400 shrink-0">•</span>
            <span>
              <a href="http://www.miracolieucaristici.org/en/Liste/list.html" target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:text-navy-500 underline underline-offset-2 font-medium">Miracoli Eucaristici</a>
              : The collection of Eucharistic Miracles Bl. Acutis is most known for
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
