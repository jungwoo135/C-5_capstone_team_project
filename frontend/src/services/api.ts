
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      'API 서버 주소가 설정되지 않았습니다.'
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(
      `${API_BASE_URL}/${endpoint.replace(/^\/+/, '')}`,
      {
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.body
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...options.headers,
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new ApiError(
        `API 요청 실패 (${response.status})`,
        response.status
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new ApiError(
        '서버 응답 시간이 초과되었습니다.'
      );
    }

    throw new ApiError(
      error instanceof Error
        ? error.message
        : '알 수 없는 네트워크 오류'
    );
  } finally {
    clearTimeout(timeout);
  }
}
