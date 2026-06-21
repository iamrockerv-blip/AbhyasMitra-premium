"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, IndianRupee, FileText, ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";

interface NoteCardProps {
  product: Product;
  index?: number;
}

export default function NoteCard({ product, index = 0 }: NoteCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-dark-800 hover:border-primary-500/30 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
    >
      {/* Cover Image */}
      <div className="relative h-44 overflow-hidden bg-dark-700">
        {product.coverUrl ? (
          <Image
            src={product.coverUrl}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-900/50 to-dark-700">
            <BookOpen className="w-16 h-16 text-primary-500/30" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-800/80 via-transparent to-transparent" />

        {/* Price Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-dark-800/90 backdrop-blur border border-white/10 text-sm font-bold text-white">
          <IndianRupee className="w-3.5 h-3.5 text-primary-400" />
          <span>{product.price}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Subject Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="badge badge-primary">{product.subject}</span>
          <span className="text-xs text-gray-500">Sem {product.semester}</span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-white text-base leading-snug mb-2 line-clamp-2 group-hover:text-primary-300 transition-colors">
          {product.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 flex-1 mb-4">
          {product.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          {product.pageCount && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <FileText className="w-3.5 h-3.5" />
              {product.pageCount} pages
            </span>
          )}
          <span className="text-xs text-gray-500">{product.branch}</span>
        </div>

        {/* CTA */}
        <Link
          href={`/notes/${product.id}`}
          className="mt-4 w-full flex items-center justify-center gap-2 btn-primary group/btn"
          id={`buy-note-${product.id}`}
        >
          <span>View &amp; Buy</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
        </Link>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.03) 0%, rgba(6,182,212,0.02) 100%)"
        }}
      />
    </motion.div>
  );
}
