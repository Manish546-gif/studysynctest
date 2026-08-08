import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { api } from '../services/api'
import {
  Plus,
  DoorOpen,
  Pencil,
  Type,
  Square,
  StickyNote,
  MessageCircle,
  Send,
  Lightbulb,
  PenTool,
  FileText,
  FlaskConical,
} from 'lucide-react'

const features = [
  {
    icon: PenTool,
    title: 'Infinite Whiteboard',
    desc: 'Sketch ideas freely on an endless canvas with real-time sync.',
    iconBg: 'bg-primary-container',
    iconColor: 'text-on-primary-container',
  },
  {
    icon: MessageCircle,
    title: 'Focused Chat',
    desc: 'Stay in context with threaded conversations alongside your work.',
    iconBg: 'bg-tertiary-container',
    iconColor: 'text-on-tertiary-container',
  },
  {
    icon: FileText,
    title: 'Shared Notes',
    desc: 'Co-edit notes and summaries that everyone can contribute to.',
    iconBg: 'bg-secondary-container',
    iconColor: 'text-on-secondary-container',
  },
]

export default function Home() {
  const heroRef = useRef(null)
  const [roomCount, setRoomCount] = useState(null)

  useEffect(() => {
    api.getRooms()
      .then((data) => setRoomCount((data.rooms || []).length))
      .catch(() => setRoomCount(0))
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.hero-title-word',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.12, ease: 'power3.out', delay: 0.2 }
      )
    }, heroRef)
    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      {/* Hero */}
      <section ref={heroRef} className="flex flex-col items-center justify-center pt-32 pb-20 px-4 text-center">
        <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight tracking-tight text-on-surface">
          <span className="hero-title-word inline-block">Study&nbsp;</span>
          <span className="hero-title-word inline-block">Together.</span>
          <br />
          <span className="hero-title-word inline-block text-primary italic">Learn&nbsp;</span>
          <span className="hero-title-word inline-block text-primary italic">Better.</span>
        </h1>

        <motion.p
          className="mt-6 text-on-surface/60 text-lg md:text-xl max-w-[36rem] leading-relaxed"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          A collaborative canvas where ideas meet. Draw, chat, and take
          notes together in real&nbsp;time.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Link
            to="/workspace"
            className="flex items-center gap-2 bg-primary-container text-on-primary-container font-display font-semibold px-6 py-3 rounded-2xl hover:shadow-lg transition-shadow"
          >
            <Plus size={20} />
            Create a Room
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 bg-on-background text-surface font-display font-semibold px-6 py-3 rounded-2xl hover:shadow-lg transition-shadow"
          >
            <DoorOpen size={20} />
            Join a Session
          </Link>
        </motion.div>
      </section>

      {/* Collaboration Preview — Bento Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-12 gap-6">
          {/* Whiteboard Preview */}
          <motion.div
            className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="canvas-grid h-72 md:h-96 relative p-6">
              {/* Floating toolbar */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-1 bg-white rounded-2xl shadow-md px-2 py-1 border border-outline-variant/20">
                {[Pencil, Type, Square, StickyNote].map((Icon, i) => (
                  <button
                    key={i}
                    className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface/50 hover:text-primary"
                  >
                    <Icon size={18} />
                  </button>
                ))}
              </div>

              {/* Sticky note */}
              <div className="absolute bottom-8 left-8 bg-primary-container/40 rounded-2xl p-4 shadow-sm max-w-[200px]">
                <p className="text-sm font-display font-semibold text-on-primary-container">
                  Organic Chemistry
                </p>
              </div>

              {/* Flask icon */}
              <div className="absolute bottom-8 right-20 w-14 h-14 rounded-full bg-tertiary-container flex items-center justify-center shadow-sm">
                <FlaskConical size={22} className="text-on-tertiary-container" />
              </div>

              {/* Decorative scribbles */}
              <svg
                className="absolute top-1/2 left-1/4 -translate-y-1/2 opacity-20 pointer-events-none"
                width="260" height="120" fill="none" viewBox="0 0 260 120"
              >
                <path d="M10 80 Q60 10 120 60 T240 40" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M20 90 Q80 30 150 70 T250 50" stroke="var(--color-tertiary)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              </svg>

              {/* Collaborator avatars */}
              <div className="absolute bottom-6 right-24 flex -space-x-2">
                {['JS', 'AM', 'Me'].map((init, i) => (
                  <div
                    key={init}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white ${
                      i === 0 ? 'bg-tertiary' : i === 1 ? 'bg-green-400' : 'bg-primary'
                    }`}
                  >
                    {init}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right column */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Chat Preview */}
            <motion.div
              className="bg-white rounded-3xl border border-outline-variant/30 p-6 shadow-sm flex-1 flex flex-col"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle size={18} className="text-primary" />
                <h3 className="font-display font-semibold text-on-surface text-sm">Focused Chat</h3>
              </div>

              <div className="flex flex-col gap-3 flex-1">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-tertiary-container flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-on-tertiary-container">JS</span>
                  </div>
                  <div className="bg-surface-container rounded-2xl rounded-tl-md px-4 py-2 text-sm text-on-surface max-w-[80%]">
                    Did you get the reaction mechanism?
                  </div>
                </div>
                <div className="flex items-start gap-2 justify-end">
                  <div className="bg-primary rounded-2xl rounded-tr-md px-4 py-2 text-sm text-on-primary max-w-[80%]">
                    Yes! Check the whiteboard.
                  </div>
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-on-primary">Me</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 bg-surface-container-low rounded-2xl px-4 py-2 border border-outline-variant/20">
                <input
                  readOnly
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface/30 outline-none"
                />
                <button className="text-primary p-1.5 rounded-lg hover:bg-primary-container/30 transition-colors">
                  <Send size={16} />
                </button>
              </div>
            </motion.div>

            {/* Stats Card */}
            <motion.div
              className="bg-secondary rounded-3xl p-6 text-on-secondary shadow-sm"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-display text-3xl font-bold">{roomCount ?? '—'}</p>
              <p className="text-sm mt-1 opacity-80">Rooms you're in right now</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              className="bg-white border border-outline-variant/30 rounded-3xl p-8 group cursor-default"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className={`w-14 h-14 rounded-2xl ${feat.iconBg} flex items-center justify-center mb-4`}>
                <feat.icon size={24} className={feat.iconColor} />
              </div>
              <h3 className="font-display font-bold text-lg text-on-surface mb-2">{feat.title}</h3>
              <p className="text-on-surface/55 text-sm leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-4 mb-24 max-w-6xl md:mx-auto rounded-3xl bg-on-background text-inverse-on-surface px-8 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Lightbulb size={36} className="mx-auto mb-4 opacity-50" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to synchronize?
          </h2>
          <p className="text-inverse-on-surface/60 max-w-[28rem] mx-auto mb-8">
            Jump into a live session or create your own room in seconds.
          </p>
          <Link
            to="/workspace"
            className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container font-display font-semibold px-8 py-3 rounded-2xl hover:shadow-lg transition-shadow"
          >
            Get Started for Free
          </Link>
        </motion.div>
      </section>

      {/* FAB */}
      <motion.button
        className="fixed bottom-8 right-8 bg-primary-container text-on-primary-container w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Create new"
      >
        <Plus size={24} />
      </motion.button>
    </div>
  )
}
