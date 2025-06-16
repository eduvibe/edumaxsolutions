import Image from 'next/image';

export function ExamVaultSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-12">
          <div className="flex-1 max-w-xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">ExamVault - Secure Exam Management</h2>
            <p className="text-lg text-gray-600 mb-8">
              Transform your examination process with ExamVault, our state-of-the-art exam management solution. 
              From question paper creation to result analysis, ExamVault provides a secure and efficient platform 
              for all your examination needs.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Secure question paper generation and storage</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Advanced anti-cheating measures and monitoring</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Comprehensive exam analytics and performance insights</span>
              </li>
            </ul>
          </div>
          <div className="flex-1 relative w-full max-w-lg aspect-video">
            <Image
              src="/media/examvault-interface.png"
              alt="ExamVault Interface"
              fill
              className="object-cover rounded-lg shadow-xl"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}