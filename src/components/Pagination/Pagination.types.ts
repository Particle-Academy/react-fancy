export interface PaginationProps {
  page: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  siblingCount?: number;
  className?: string;
}
