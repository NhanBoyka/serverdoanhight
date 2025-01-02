import { OrderService } from './order.service';

import { ProductService } from './../product/product.service';
import { CartService } from './../cart/cart.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CheckoutDto } from 'src/checkout/dto/checkout.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Order } from './model/order.schema';
import { Model } from 'mongoose';
import { OrderDetail } from './model/order-detail.schema';
import { Customer } from 'src/customer/model/customer.schema';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(OrderDetail.name)
    private readonly orderDetailModel: Model<OrderDetail>,
  ) {}

  async create(order: Order, orderDetails: OrderDetail[]) {
    await this.orderDetailModel.insertMany(orderDetails);

    const newOrder = await this.orderModel.create({
      ...order,
      order_detail: orderDetails.map((detail) => detail._id),
    });

    return await this.orderModel
      .findOne({ _id: newOrder._id })
      .populate({
        path: 'order_detail',
        populate: {
          path: 'product_id',
        },
      })
      .lean<Order>(true);
  }

  async findAll(
    page: number,
    limit: number,
    sort: 'asc' | 'desc',
    keyword: any,
  ) {
    return await this.orderModel
      .find(
        keyword
          ? {
              $or: [
                { email: new RegExp(keyword, 'i') },
                { phone_number: new RegExp(keyword, 'i') },
              ],
            }
          : {},
      )
      .skip((page - 1) * limit)
      .sort({ name: sort })
      .limit(limit)
      .populate('order_detail')
      .lean<Order[]>(true);
  }

  async findOne(id: string) {
    return await this.orderModel
      .findOne({ _id: id })
      .populate({
        path: 'order_detail',
        populate: {
          path: 'product_id',
        },
      })
      .lean<Order>(true);
  }

  async findByCustomer(customer_id: string) {
    return await this.orderModel.find({ customer_id }).lean<Order[]>(true);
  }

  async getLastOptionDays(startDate: Date, endDate: Date) {
    return await this.orderModel
      .find({ created_at: { $gte: startDate, $lt: endDate } })
      .sort({ created_at: 1 }) // Sắp xếp theo ngày giao hàng tăng dần
      .lean<Order[]>(true);
  }

  async updateStatus(id: string, status: boolean) {
    return (
      await this,
      this.orderModel
        .findByIdAndUpdate(id, { status }, { new: true })
        .lean<Order>(true)
    );
  }
}
