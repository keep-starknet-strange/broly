import { fetchWrapper, useMock, mockResponse } from "./requests";
import { mockInscription, mockInscriptionViews, mockRequestViews } from "./mock";

export const getNewInscriptions = async (pageLength: number, page: number) => {
  if (useMock) return mockResponse(mockInscriptionViews);
  return await fetchWrapper(
    `inscriptions/get-new-inscriptions?pageLength=${pageLength}&page=${page}`
  );
};

export const getHotInscriptions = async (pageLength: number, page: number) => {
  if (useMock) return mockResponse(mockInscriptionViews);
  return await fetchWrapper(
    `inscriptions/get-hot-inscriptions?pageLength=${pageLength}&page=${page}`
  );
}

export const getMyInscriptions = async (address: string, pageLength: number, page: number) => {
  if (useMock) return mockResponse(mockInscriptionViews);
  return await fetchWrapper(
    `inscriptions/get-my-inscriptions?address=${address}&pageLength=${pageLength}&page=${page}`
  );
}

export const getMyNewInscriptions = async (address: string, pageLength: number, page: number) => {
  if (useMock) return mockResponse(mockInscriptionViews);
  return await fetchWrapper(
    `inscriptions/get-my-new-inscriptions?address=${address}&pageLength=${pageLength}&page=${page}`
  );
}

export const getMyTopInscriptions = async (address: string, pageLength: number, page: number) => {
  if (useMock) return mockResponse(mockInscriptionViews);
  return await fetchWrapper(
    `inscriptions/get-my-top-inscriptions?address=${address}&pageLength=${pageLength}&page=${page}`
  );
}

export const getOpenInscriptionRequests = async (pageLength: number, page: number) => {
  if (useMock) return mockResponse(mockRequestViews);
  return await fetchWrapper(
    `inscriptions/get-open-requests?pageLength=${pageLength}&page=${page}`
  );
}

export const getInscriptionRequests = async (pageLength: number, page: number) => {
  if (useMock) return mockResponse(mockRequestViews);
  return await fetchWrapper(
    `inscriptions/get-requests?pageLength=${pageLength}&page=${page}`
  );
}

export const getInscriptionRequest = async (id: string) => {
  if (useMock) return mockResponse(mockRequestViews[0]);
  return await fetchWrapper(`inscriptions/get-request?id=${id}`);
}

export const getMyInscriptionRequests = async (address: string, pageLength: number, page: number) => {
  if (useMock) return mockResponse(mockRequestViews);
  return await fetchWrapper(
    `inscriptions/get-my-requests?address=${address}&pageLength=${pageLength}&page=${page}`
  );
}

export const uploadInscriptionImg = async (file: File) => {
  return await fetchWrapper('upload-inscription-img', {
    method: 'POST',
    body: file
  });
}

export const getInscription = async (id: string) => {
  if (useMock) return mockResponse(mockInscription);
  return await fetchWrapper(`inscriptions/get-inscription?id=${id}`);
}
