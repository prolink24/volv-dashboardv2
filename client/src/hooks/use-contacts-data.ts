import { useQuery } from "@tanstack/react-query";
import { ContactsData } from "@shared/schema";

interface UseContactsDataProps {
  limit?: number;
  offset?: number;
  search?: string;
}

export function useContactsData({ limit = 50, offset = 0, search }: UseContactsDataProps = {}) {
  const baseEndpoint = search ? "/api/contacts/search" : "/api/contacts";
  
  const queryParams = new URLSearchParams();
  queryParams.append("limit", limit.toString());
  queryParams.append("offset", offset.toString());
  
  if (search) {
    queryParams.append("q", search);
  }
  
  const queryString = queryParams.toString();
  const endpoint = `${baseEndpoint}?${queryString}`;
  
  return useQuery<ContactsData>({
    queryKey: [endpoint],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useContactDetails(id: number | null) {
  return useQuery({
    queryKey: [`/api/contacts/${id}`],
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
