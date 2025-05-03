import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { DatePicker } from '@/components/ui/date-picker';
import { Spinner } from '@/components/ui/spinner';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Types
type Defect = {
  id: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  defectType: 'MANUFACTURING' | 'DESIGN' | 'FUNCTIONAL' | 'COSMETIC' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  returnId: string;
  componentId?: string;
  createdAt: string;
  updatedAt: string;
  return: {
    id: string;
    reason: string;
    status: string;
    assembly?: {
      id: string;
      serialNumber: string;
      product: {
        id: string;
        name: string;
        modelNumber: string;
      };
    };
  };
  component?: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
  reportedBy: {
    id: string;
    name: string;
  };
  resolvedBy?: {
    id: string;
    name: string;
  };
  resolvedAt?: string;
  notes?: string;
};

type DefectsListProps = {
  returnId?: string;
  componentId?: string;
  readOnly?: boolean;
  limit?: number;
  showFilters?: boolean;
  title?: string;
};

const DefectsList = ({
  returnId,
  componentId,
  readOnly = false,
  limit = 10,
  showFilters = true,
  title = 'Defects',
}: DefectsListProps) => {
  const router = useRouter();

  // State
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  // Fetch defects with filters
  const fetchDefects = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (returnId) params.append('returnId', returnId);
      if (componentId) params.append('componentId', componentId);
      if (statusFilter) params.append('status', statusFilter);
      if (severityFilter) params.append('severity', severityFilter);
      if (typeFilter) params.append('defectType', typeFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (fromDate) params.append('fromDate', fromDate.toISOString());
      if (toDate) params.append('toDate', toDate.toISOString());
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`/api/defects?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch defects');
      }

      const data = await response.json();
      setDefects(data.defects);
      setTotalCount(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching defects:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load defects when filters change
  useEffect(() => {
    fetchDefects();
  }, [returnId, componentId, statusFilter, severityFilter, typeFilter, currentPage, limit, fromDate, toDate]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDefects();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, severityFilter, typeFilter, searchQuery, fromDate, toDate]);

  // Navigate to details page
  const handleDefectClick = (defectId: string) => {
    if (readOnly) return;
    router.push(`/defects/${defectId}`);
  };

  // Get severity badge styling
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return <Badge variant="outline">Low</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary">Medium</Badge>;
      case 'HIGH':
        return <Badge variant="warning">High</Badge>;
      case 'CRITICAL':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="destructive">Open</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">In Progress</Badge>;
      case 'RESOLVED':
        return <Badge variant="success">Resolved</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Generate pagination
  const totalPages = Math.ceil(totalCount / limit);
  
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            
            // Logic to determine page numbers to display
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
              if (i === 4) return (
                <PaginationItem key="ellipsis-end">
                  <PaginationEllipsis />
                </PaginationItem>
              );
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
              if (i === 0) return (
                <PaginationItem key="ellipsis-start">
                  <PaginationEllipsis />
                </PaginationItem>
              );
            } else {
              if (i === 0) return (
                <PaginationItem key="ellipsis-start">
                  <PaginationEllipsis />
                </PaginationItem>
              );
              if (i === 4) return (
                <PaginationItem key="ellipsis-end">
                  <PaginationEllipsis />
                </PaginationItem>
              );
              pageNum = currentPage - 1 + i;
            }
            
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink 
                  isActive={currentPage === pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {returnId ? 'Defects for this return' : 'View and manage defects in the system'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        {showFilters && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input 
                  placeholder="Search defects..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Select value={statusFilter || ''} onValueChange={(value) => setStatusFilter(value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={severityFilter || ''} onValueChange={(value) => setSeverityFilter(value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Severities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter || ''} onValueChange={(value) => setTypeFilter(value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="MANUFACTURING">Manufacturing</SelectItem>
                    <SelectItem value="DESIGN">Design</SelectItem>
                    <SelectItem value="FUNCTIONAL">Functional</SelectItem>
                    <SelectItem value="COSMETIC">Cosmetic</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker 
                  placeholder="From Date"
                  date={fromDate}
                  onDateChange={setFromDate}
                />
                <DatePicker 
                  placeholder="To Date"
                  date={toDate}
                  onDateChange={setToDate}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStatusFilter(undefined);
                  setSeverityFilter(undefined);
                  setTypeFilter(undefined);
                  setSearchQuery('');
                  setFromDate(undefined);
                  setToDate(undefined);
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 my-4">
            <div className="flex">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : defects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No defects found. {!readOnly && (
              <Link href="/defects/new" className="text-primary hover:underline">
                Create a new defect
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="border rounded-md">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    {!returnId && <TableHead>Return</TableHead>}
                    {!componentId && <TableHead>Component</TableHead>}
                    <TableHead>Reported By</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defects.map((defect) => (
                    <TableRow 
                      key={defect.id}
                      onClick={() => handleDefectClick(defect.id)}
                      className={!readOnly ? "cursor-pointer hover:bg-muted/50" : ""}
                    >
                      <TableCell className="font-mono">{defect.id.substring(0, 8)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {defect.description}
                      </TableCell>
                      <TableCell>{defect.defectType.charAt(0) + defect.defectType.slice(1).toLowerCase()}</TableCell>
                      <TableCell>{getSeverityBadge(defect.severity)}</TableCell>
                      <TableCell>{getStatusBadge(defect.status)}</TableCell>
                      {!returnId && (
                        <TableCell>
                          {defect.return.assembly ? (
                            <span title={defect.return.assembly.product.name}>
                              {defect.return.assembly.serialNumber}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                      )}
                      {!componentId && (
                        <TableCell>
                          {defect.component ? defect.component.name : 'N/A'}
                        </TableCell>
                      )}
                      <TableCell>{defect.reportedBy.name}</TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(defect.createdAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {renderPagination()}
          </>
        )}

        {/* Actions */}
        {!readOnly && !returnId && (
          <div className="mt-6 flex justify-end">
            <Button asChild>
              <Link href="/defects/new">Create New Defect</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DefectsList; 