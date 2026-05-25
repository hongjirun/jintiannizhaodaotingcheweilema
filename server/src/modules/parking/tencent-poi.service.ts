import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TencentPoiService {
  private readonly logger = new Logger(TencentPoiService.name);
  private readonly key = process.env.TENCENT_MAP_KEY;
  private readonly baseUrl = 'https://apis.map.qq.com/ws/place/v1/search';

  async fetchParkingByCity(city: string): Promise<any[]> {
    const results: any[] = [];
    let page = 0;
    const pageSize = 20;

    while (true) {
      try {
        await this.sleep(300);
        const res = await axios.get(this.baseUrl, {
          params: {
            keyword: '停车场',
            boundary: `region(${city},0)`,
            page_size: pageSize,
            page_index: page,
            key: this.key,
          },
          timeout: 10000,
        });

        const data = res.data;
        if (data.status !== 0 || !data.data || data.data.length === 0) {
          break;
        }

        results.push(...data.data);
        this.logger.log(`城市[${city}] 第${page + 1}页，获取${data.data.length}条，累计${results.length}条`);

        if (data.data.length < pageSize) break;
        page++;
        if (page >= 50) break;
      } catch (e) {
        this.logger.error(`拉取失败: ${e.message}`);
        break;
      }
    }

    return results;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  formatPoiToParking(poi: any) {
    return {
      poiId: poi.id || null,
      name: poi.title || '',
      address: poi.address || '',
      city: poi.ad_info?.city || '',
      province: poi.ad_info?.province || '',
      longitude: poi.location?.lng || 0,
      latitude: poi.location?.lat || 0,
      phone: poi.tel || '',
      status: 1,
      dataSource: 'tencent',
    };
  }
}
